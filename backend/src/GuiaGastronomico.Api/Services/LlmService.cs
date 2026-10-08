using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using GuiaGastronomico.Api.Options;
using Microsoft.Extensions.Options;

namespace GuiaGastronomico.Api.Services;

// Implementação OpenAI-compatible (funciona com OpenAI, Groq, OpenRouter, etc.).
// Expõe UMA ferramenta: buscar_restaurantes.
public class LlmService(HttpClient http, IOptions<LlmOptions> options, ILogger<LlmService> logger) : ILlmService
{
    public bool IsConfigured => !string.IsNullOrWhiteSpace(options.Value.ApiKey);

    public async Task<LlmTurn> ChatAsync(IReadOnlyList<LlmMsg> messages, CancellationToken ct = default)
    {
        var opt = options.Value;
        using var req = new HttpRequestMessage(HttpMethod.Post, $"{opt.BaseUrl.TrimEnd('/')}/chat/completions");
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", opt.ApiKey);
        req.Content = new StringContent(JsonSerializer.Serialize(new
        {
            model = opt.Model,
            temperature = 0.3,
            max_tokens = 500,
            tool_choice = "auto",
            tools = new object[]
            {
                new
                {
                    type = "function",
                    function = new
                    {
                        name = "buscar_restaurantes",
                        description = "Busca restaurantes próximos ao usuário. Use UMA vez por pergunta.",
                        parameters = new
                        {
                            type = "object",
                            properties = new
                            {
                                consulta = new
                                {
                                    type = "string",
                                    description = "Ex: 'japonês barato', 'pizza', 'vegetariano'. Combine o pedido com os gostos do usuário.",
                                },
                                max_resultados = new { type = "integer", minimum = 1, maximum = 5 },
                            },
                            required = new[] { "consulta" },
                        },
                    },
                },
            },
            messages = messages.Select(m => m.ToolCall is not null
                ? (object)new
                {
                    role = "assistant",
                    content = m.Content,
                    tool_calls = new[]
                    {
                        new
                        {
                            id = m.ToolCall.Id,
                            type = "function",
                            function = new { name = m.ToolCall.Name, arguments = m.ToolCall.Arguments },
                        },
                    },
                }
                : m.Role == "tool"
                    ? new { role = "tool", tool_call_id = m.ToolCallId, content = m.Content }
                    : new { role = m.Role, content = m.Content }),
        }), Encoding.UTF8, "application/json");

        using var res = await http.SendAsync(req, ct);
        var body = await res.Content.ReadAsStringAsync(ct);
        if (!res.IsSuccessStatusCode)
        {
            logger.LogWarning("LLM {Status}: {Body}", (int)res.StatusCode, body[..Math.Min(300, body.Length)]);
            throw new HttpRequestException($"LLM retornou {(int)res.StatusCode}");
        }

        using var doc = JsonDocument.Parse(body);
        var msg = doc.RootElement.GetProperty("choices")[0].GetProperty("message");
        var content = msg.TryGetProperty("content", out var c) ? c.GetString() : null;

        LlmToolCall? tool = null;
        if (msg.TryGetProperty("tool_calls", out var calls) && calls.GetArrayLength() > 0)
        {
            var t = calls[0];
            var fn = t.GetProperty("function");
            if (fn.GetProperty("name").GetString() == "buscar_restaurantes")
                tool = new LlmToolCall(
                    t.GetProperty("id").GetString() ?? Guid.NewGuid().ToString(),
                    "buscar_restaurantes",
                    fn.GetProperty("arguments").GetString() ?? "{}");
        }
        return new LlmTurn(content, tool);
    }
}

public record LlmTurn(string? Content, LlmToolCall? ToolCall);
