using System.Text.Json;
using GuiaGastronomico.Api.Data;
using GuiaGastronomico.Api.Domain;
using GuiaGastronomico.Api.Dtos;
using Microsoft.EntityFrameworkCore;

namespace GuiaGastronomico.Api.Services;

public class ChatOrchestrator(
    AppDbContext db,
    IPlacesService places,
    ILlmService llm,
    ReviewService reviews,
    ILogger<ChatOrchestrator> logger)
{
    private static readonly string[] KnownCuisines =
        ["japonesa", "lanches", "mexicana", "italiana", "brasileira", "pizza", "doces", "vegetariana", "chinesa", "árabe", "saudável", "cafés"];

    public async Task<ChatResponse> HandleAsync(Guid userId, ChatRequest req, CancellationToken ct = default)
    {
        var user = await db.Users.Include(u => u.Cuisines)
            .FirstOrDefaultAsync(u => u.Id == userId, ct);
        if (user is null) throw new InvalidOperationException("Usuário não encontrado.");

        var lat = req.Lat ?? user.Latitude;
        var lng = req.Lng ?? user.Longitude;
        var tastes = user.Cuisines.Select(c => c.Cuisine).ToList();
        var message = req.Message.Trim();

        List<Restaurant> found;
        string reply;

        if (!llm.IsConfigured)
        {
            // Plano B: sem chave de LLM, busca direta + resposta modelo.
            found = await places.SearchAsync(BuildQuery(message, tastes), lat, lng, 3, ct);
            reply = BuildFallbackReply(message, tastes, found);
            return await ToResponseAsync(reply, found, lat, lng, ct);
        }

        try
        {
            var system = SystemPrompt(tastes, user.LocationLabel, lat, lng);
            var messages = new List<LlmMsg>
            {
                new("system", system),
                new("user", $"Pedido: {message}"),
            };

            var turn = await llm.ChatAsync(messages, ct);
            if (turn.ToolCall is null)
            {
                // LLM respondeu sem ferramenta: busca mesmo assim p/ garantir cards.
                found = await places.SearchAsync(BuildQuery(message, tastes), lat, lng, 3, ct);
                reply = string.IsNullOrWhiteSpace(turn.Content)
                    ? BuildFallbackReply(message, tastes, found)
                    : turn.Content;
                return await ToResponseAsync(reply, found, lat, lng, ct);
            }

            var (consulta, max) = ParseToolArgs(turn.ToolCall.Arguments, message);
            found = await places.SearchAsync(consulta, lat, lng, Math.Clamp(max, 1, 5), ct);

            messages.Add(new("assistant", turn.Content ?? "", ToolCall: turn.ToolCall));
            messages.Add(new("tool", ToolResultJson(found, lat, lng), ToolCallId: turn.ToolCall.Id));

            var final = await llm.ChatAsync(messages, ct);
            reply = string.IsNullOrWhiteSpace(final.Content)
                ? BuildFallbackReply(message, tastes, found)
                : final.Content;

            return await ToResponseAsync(reply, found.Take(3).ToList(), lat, lng, ct);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Chat LLM falhou, usando fallback.");
            found = await places.SearchAsync(BuildQuery(message, tastes), lat, lng, 3, ct);
            return await ToResponseAsync(BuildFallbackReply(message, tastes, found), found, lat, lng, ct);
        }
    }

    private static string SystemPrompt(List<string> tastes, string? location, double? lat, double? lng) =>
        $"""
        Você é o assistente do app Guia Gastronômico. Responda em português do Brasil, de forma curta e amigável (máx. 4 frases).
        Gostos do usuário: {(tastes.Count > 0 ? string.Join(", ", tastes) : "não informados")}.
        Localização: {(location ?? (lat.HasValue ? $"{lat},{lng}" : "não informada"))}.
        Regras:
        1. Chame buscar_restaurantes UMA vez, com consulta combinando o pedido e os gostos.
        2. Recomende APENAS restaurantes retornados pela ferramenta (máx. 3).
        3. Justifique cada escolha com base no pedido e nos gostos do usuário.
        4. Se a ferramenta não retornar nada, diga que não achou e sugira tentar outro gosto.
        """;

    private static (string consulta, int max) ParseToolArgs(string argsJson, string fallback)
    {
        try
        {
            using var doc = JsonDocument.Parse(argsJson);
            var root = doc.RootElement;
            var q = root.TryGetProperty("consulta", out var qEl) ? qEl.GetString() ?? "" : "";
            var m = root.TryGetProperty("max_resultados", out var mEl) && mEl.TryGetInt32(out var v) ? v : 3;
            return (string.IsNullOrWhiteSpace(q) ? fallback : q, Math.Clamp(m, 1, 5));
        }
        catch
        {
            return (fallback, 3);
        }
    }

    private static string ToolResultJson(List<Restaurant> list, double? lat, double? lng) =>
        JsonSerializer.Serialize(list.Take(5).Select(r => new
        {
            r.Name,
            r.Address,
            r.Rating,
            r.PriceLevel,
            r.Cuisines,
            distanceKm = lat.HasValue && lng.HasValue
                ? Math.Round(Data.SeedRestaurants.GeoKm(lat.Value, lng.Value, r.Lat, r.Lng), 1) : (double?)null,
        }));

    internal static string BuildQuery(string message, List<string> tastes)
    {
        var norm = Data.SeedRestaurants.Norm(message);
        var words = norm.Split([' ', ',', '.', '!', '?'], StringSplitOptions.RemoveEmptyEntries);
        var hit = KnownCuisines.FirstOrDefault(c =>
        {
            var nc = Data.SeedRestaurants.Norm(c);
            return norm.Contains(nc) || words.Any(w => w.Length >= 4 && (nc.Contains(w) || w.Contains(nc)));
        });
        if (hit is not null) return message.Length <= 60 ? message : hit;
        if (norm.Contains("barato")) return $"restaurante barato {(tastes.FirstOrDefault() ?? "")}".Trim();
        if (tastes.Count > 0) return $"{tastes[0]} {message}"[..Math.Min(60, $"{tastes[0]} {message}".Length)];
        return message;
    }

    private static string BuildFallbackReply(string message, List<string> tastes, List<Restaurant> found)
    {
        if (found.Count == 0)
            return "Não achei nada por perto com esse pedido. Tenta outro gosto ou região? 🍽️";
        var taste = tastes.Count > 0 ? $" (pensei nos seus gostos: {string.Join(", ", tastes.Take(3))})" : "";
        var names = string.Join("; ", found.Take(3).Select(r =>
            $"{r.Name}{(r.Rating.HasValue ? $" ★{r.Rating:F1}" : "")}"));
        return $"Achei {found.Count} opção(ões) pra \"{message}\"{taste}: {names}. Bom apetite! 😋";
    }

    private async Task<ChatResponse> ToResponseAsync(string reply, List<Restaurant> list,
        double? lat, double? lng, CancellationToken ct)
    {
        var top = list.Take(3).ToList();
        var stats = await reviews.StatsAsync(top.Select(r => r.Id), ct);
        return new ChatResponse(reply, top.Select(r =>
        {
            stats.TryGetValue(r.Id, out var s);
            return new RestaurantDto(
                r.Id, r.PlaceId, r.Name, r.Address, r.Lat, r.Lng,
                r.Rating, r.PriceLevel, RestaurantDtoMapper.PhotosOf(r), r.Cuisines,
                lat.HasValue && lng.HasValue
                    ? Math.Round(Data.SeedRestaurants.GeoKm(lat.Value, lng.Value, r.Lat, r.Lng), 1)
                    : null,
                s.avg, s.count);
        }).ToList());
    }
}
