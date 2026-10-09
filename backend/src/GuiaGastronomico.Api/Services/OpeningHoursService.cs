using System.Text.Json;
using GuiaGastronomico.Api.Domain;
using GuiaGastronomico.Api.Dtos;
using GuiaGastronomico.Api.Options;
using Microsoft.Extensions.Options;

namespace GuiaGastronomico.Api.Services;

/// <summary>
/// Horários de funcionamento. Seeds usam tabela estática; lugares do Google
/// são consultados ao vivo (Places Details, só regularOpeningHours).
/// OpenNow é calculado no horário de São Paulo.
/// </summary>
public class OpeningHoursService(
    HttpClient http,
    IOptions<GoogleOptions> options,
    ILogger<OpeningHoursService> logger) : IOpeningHoursService
{
    // Dia: 0=dom .. 6=sáb. (abre, fecha) em "HH:mm".
    private static readonly Dictionary<string, List<DayHours>> SeedHours = new()
    {
        ["seed-tanaka"] = Weekly(["18:00", "23:00"], ["18:00", "23:00"], ["18:00", "23:00"], ["18:00", "23:00"], ["18:00", "23:00"], ["18:00", "23:00"], ["12:00", "16:00"]),
        ["seed-temaki"] = Weekly(["11:00", "22:00"], ["11:00", "22:00"], ["11:00", "22:00"], ["11:00", "22:00"], ["11:00", "22:00"], ["11:00", "22:00"], ["11:00", "22:00"]),
        ["seed-burger"] = Weekly(null, ["18:00", "23:30"], ["18:00", "23:30"], ["18:00", "23:30"], ["18:00", "23:30"], ["18:00", "23:30"], ["18:00", "23:30"]),
        ["seed-taco"] = Weekly(["12:00", "23:00"], ["12:00", "23:00"], ["12:00", "23:00"], ["12:00", "23:00"], ["12:00", "23:00"], ["12:00", "23:00"], ["12:00", "23:00"]),
        ["seed-trattoria"] = Weekly(null, ["19:00", "23:30"], ["19:00", "23:30"], ["19:00", "23:30"], ["19:00", "23:30"], ["19:00", "23:30"], ["19:00", "23:30"]),
        ["seed-forno"] = Weekly(["18:00", "23:00"], ["18:00", "23:00"], ["18:00", "23:00"], ["18:00", "23:00"], ["18:00", "23:00"], ["18:00", "23:00"], ["18:00", "23:00"]),
        ["seed-feijoada"] = Weekly(null, ["11:00", "16:00"], ["11:00", "16:00"], ["11:00", "16:00"], ["11:00", "16:00"], ["11:00", "16:00"], ["11:00", "16:00"]),
        ["seed-acaraje"] = Weekly(null, null, ["11:00", "21:00"], ["11:00", "21:00"], ["11:00", "21:00"], ["11:00", "21:00"], ["11:00", "21:00"]),
        ["seed-doceria"] = Weekly(["10:00", "20:00"], ["10:00", "20:00"], ["10:00", "20:00"], ["10:00", "20:00"], ["10:00", "20:00"], ["10:00", "20:00"], ["10:00", "20:00"]),
        ["seed-veg"] = Weekly(["12:00", "18:00"], ["11:00", "22:00"], ["11:00", "22:00"], ["11:00", "22:00"], ["11:00", "22:00"], ["11:00", "22:00"], ["11:00", "22:00"]),
        ["seed-dragon"] = Weekly(["11:30", "23:00"], ["11:30", "23:00"], ["11:30", "23:00"], ["11:30", "23:00"], ["11:30", "23:00"], ["11:30", "23:00"], ["11:30", "23:00"]),
        ["seed-beirute"] = Weekly(["10:00", "22:00"], ["10:00", "22:00"], ["10:00", "22:00"], ["10:00", "22:00"], ["10:00", "22:00"], ["10:00", "22:00"], ["10:00", "22:00"]),
        ["seed-padaria"] = Weekly(["06:30", "20:00"], ["06:30", "20:00"], ["06:30", "20:00"], ["06:30", "20:00"], ["06:30", "20:00"], ["06:30", "20:00"], ["06:30", "20:00"]),
        ["seed-churras"] = Weekly(["11:30", "17:00"], ["11:30", "23:00"], ["11:30", "23:00"], ["11:30", "23:00"], ["11:30", "23:00"], ["11:30", "23:00"], ["11:30", "23:00"]),
        ["seed-saudavel"] = Weekly(null, ["10:00", "21:00"], ["10:00", "21:00"], ["10:00", "21:00"], ["10:00", "21:00"], ["10:00", "21:00"], ["10:00", "21:00"]),
    };

    // seg..dom na ordem dos parâmetros; null = fechado.
    private static List<DayHours> Weekly(params string?[]?[] days)
    {
        var idx = new[] { 1, 2, 3, 4, 5, 6, 0 };
        return idx.Zip(days, (d, h) => new DayHours
        {
            Day = d,
            Opens = h?[0],
            Closes = h?[1],
        }).Where(h => h.Opens is not null).ToList();
    }

    private static readonly List<DayHours> DefaultHours =
        Weekly(["11:30", "23:00"], ["11:30", "23:00"], ["11:30", "23:00"], ["11:30", "23:00"], ["11:30", "23:00"], ["11:30", "23:00"], ["12:00", "22:00"]);

    public async Task EnrichAsync(List<Restaurant> list, CancellationToken ct = default)
    {
        var live = new List<Restaurant>();
        foreach (var r in list)
        {
            // Seeds/defaults são instantâneos — e o OpenNow é recalculado sempre
            // (as entidades de fallback são compartilhadas entre requests).
            if (SeedHours.TryGetValue(r.PlaceId, out var seed))
            {
                if (r.OpeningHours.Count == 0)
                    r.OpeningHours = seed.Select(Clone).ToList();
                r.OpenNow = IsOpenNow(r.OpeningHours);
            }
            else if (r.PlaceId.StartsWith("adv-", StringComparison.OrdinalIgnoreCase))
            {
                if (r.OpeningHours.Count == 0)
                    r.OpeningHours = DefaultHours.Select(Clone).ToList();
                r.OpenNow = IsOpenNow(r.OpeningHours);
            }
            else if (r.OpeningHours.Count == 0)
            {
                live.Add(r);
            }
        }
        if (live.Count == 0) return;

        using var cts = CancellationTokenSource.CreateLinkedTokenSource(ct);
        cts.CancelAfter(TimeSpan.FromSeconds(6));
        await Task.WhenAll(live.Select(r => EnrichLiveAsync(r, cts.Token)));
    }

    private static DayHours Clone(DayHours h) => new() { Day = h.Day, Opens = h.Opens, Closes = h.Closes };

    private async Task EnrichLiveAsync(Restaurant r, CancellationToken ct)
    {
        try
        {
            var live = await FromGoogleAsync(r.PlaceId, ct);
            if (live is not null)
            {
                r.OpeningHours = live.Value.Hours;
                r.OpenNow = live.Value.OpenNow ?? IsOpenNow(live.Value.Hours);
            }
        }
        catch (OperationCanceledException) { /* timeout: sem selo */ }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Horários indisponíveis p/ {PlaceId}", r.PlaceId);
        }
    }

    public async Task<List<GoogleReviewDto>> GetGoogleReviewsAsync(string placeId, CancellationToken ct = default)
    {
        if (placeId.StartsWith("seed-", StringComparison.OrdinalIgnoreCase)
            || placeId.StartsWith("adv-", StringComparison.OrdinalIgnoreCase))
            return new();
        var key = options.Value.ApiKey;
        if (string.IsNullOrWhiteSpace(key)) return new();
        try
        {
            using var cts = CancellationTokenSource.CreateLinkedTokenSource(ct);
            cts.CancelAfter(TimeSpan.FromSeconds(6));
            using var req = new HttpRequestMessage(HttpMethod.Get,
                $"https://places.googleapis.com/v1/places/{placeId}?languageCode=pt-BR");
            req.Headers.Add("X-Goog-Api-Key", key);
            req.Headers.Add("X-Goog-FieldMask", "reviews");
            using var res = await http.SendAsync(req, cts.Token);
            if (!res.IsSuccessStatusCode) return new();
            using var doc = JsonDocument.Parse(await res.Content.ReadAsStringAsync(cts.Token));
            if (!doc.RootElement.TryGetProperty("reviews", out var arr)) return new();
            var list = new List<GoogleReviewDto>();
            foreach (var rv in arr.EnumerateArray().Take(5))
            {
                try
                {
                    var author = rv.TryGetProperty("authorAttribution", out var aa)
                        && aa.TryGetProperty("displayName", out var dn)
                        ? dn.GetString() ?? "Visitante" : "Visitante";
                    var stars = rv.TryGetProperty("rating", out var rt) ? rt.GetInt32() : 0;
                    string? text = null;
                    if (rv.TryGetProperty("text", out var tx) && tx.TryGetProperty("text", out var tt))
                        text = tt.GetString();
                    text ??= rv.TryGetProperty("originalText", out var ot) && ot.TryGetProperty("text", out var ot2)
                        ? ot2.GetString() : null;
                    string? published = rv.TryGetProperty("relativePublishTimeDescription", out var rp)
                        ? rp.GetString()
                        : rv.TryGetProperty("publishTime", out var pt) ? pt.GetString() : null;
                    list.Add(new GoogleReviewDto(author, Math.Clamp(stars, 0, 5), text, published));
                }
                catch { /* pula avaliação malformada */ }
            }
            return list;
        }
        catch (OperationCanceledException) { return new(); }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Reviews do Google indisponíveis p/ {PlaceId}", placeId);
            return new();
        }
    }

    private async Task<(List<DayHours> Hours, bool? OpenNow)?> FromGoogleAsync(string placeId, CancellationToken ct)
    {
        var key = options.Value.ApiKey;
        if (string.IsNullOrWhiteSpace(key)) return null;
        using var req = new HttpRequestMessage(HttpMethod.Get,
            $"https://places.googleapis.com/v1/places/{placeId}");
        req.Headers.Add("X-Goog-Api-Key", key);
        req.Headers.Add("X-Goog-FieldMask", "regularOpeningHours");
        using var res = await http.SendAsync(req, ct);
        if (!res.IsSuccessStatusCode) return null;
        using var doc = JsonDocument.Parse(await res.Content.ReadAsStringAsync(ct));
        if (!doc.RootElement.TryGetProperty("regularOpeningHours", out var roh)) return null;
        bool? openNow = roh.TryGetProperty("openNow", out var on) ? on.GetBoolean() : null;
        var hours = ParsePeriods(roh);
        return (hours, openNow);
    }

    internal static List<DayHours> ParsePeriods(JsonElement roh)
    {
        var list = new List<DayHours>();
        if (!roh.TryGetProperty("periods", out var periods)) return list;
        foreach (var p in periods.EnumerateArray())
        {
            try
            {
                if (!p.TryGetProperty("open", out var open)) continue;
                var day = open.TryGetProperty("day", out var d) ? d.GetInt32() : 0;
                var opens = Fmt(open);
                string? closes = p.TryGetProperty("close", out var close) ? Fmt(close) : null;
                list.Add(new DayHours { Day = day, Opens = opens, Closes = closes });
            }
            catch { /* pula período malformado */ }
        }
        return list;
    }

    private static string Fmt(JsonElement point)
    {
        var h = point.TryGetProperty("hour", out var hh) ? hh.GetInt32() : 0;
        var m = point.TryGetProperty("minute", out var mm) ? mm.GetInt32() : 0;
        return $"{h:D2}:{m:D2}";
    }

    internal static bool IsOpenNow(List<DayHours> hours)
    {
        var now = SaoPauloNow();
        var dow = (int)now.DayOfWeek;
        var mins = now.Hour * 60 + now.Minute;
        // Períodos de hoje…
        foreach (var h in hours.Where(h => h.Day == dow))
        {
            if (h.Opens is null || h.Closes is null) continue;
            var o = ToMin(h.Opens);
            var c = ToMin(h.Closes);
            if (c <= o) { if (mins >= o) return true; } // vira a noite
            else if (mins >= o && mins < c) return true;
        }
        // …e a virada de ontem que invade hoje de madrugada.
        foreach (var h in hours.Where(h => h.Day == (dow + 6) % 7))
        {
            if (h.Opens is null || h.Closes is null) continue;
            var o = ToMin(h.Opens);
            var c = ToMin(h.Closes);
            if (c <= o && mins < c) return true;
        }
        return false;
    }

    private static int ToMin(string hm) => int.Parse(hm[..2]) * 60 + int.Parse(hm[3..5]);

    internal static DateTime SaoPauloNow()
    {
        foreach (var id in new[] { "E. South America Standard Time", "America/Sao_Paulo" })
        {
            try { return TimeZoneInfo.ConvertTime(DateTime.UtcNow, TimeZoneInfo.FindSystemTimeZoneById(id)); }
            catch { /* tenta o próximo */ }
        }
        return DateTime.Now;
    }
}
