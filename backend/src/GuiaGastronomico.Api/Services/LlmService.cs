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
        // Timeout próprio: sem resposta em 30s, cai p/ o fallback em vez de travar o chat.
        using var cts = CancellationTokenSource.CreateLinkedTokenSource(ct);
        cts.CancelAfter(TimeSpan.FromSeconds(30));
        var token = cts.Token;
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
                    tool_calls = new[] { BuildToolCall(m.ToolCall) },
                }
                : m.Role == "tool"
                    ? new { role = "tool", tool_call_id = m.ToolCallId, content = m.Content }
                    : new { role = m.Role, content = m.Content }),
        }), Encoding.UTF8, "application/json");

        using var res = await http.SendAsync(req, token);
        var body = await res.Content.ReadAsStringAsync(token);
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
            {
                string? thoughtSignature = null;
                if (t.TryGetProperty("extra_content", out var ec)
                    && ec.TryGetProperty("google", out var g)
                    && g.TryGetProperty("thought_signature", out var ts))
                    thoughtSignature = ts.GetString();
                tool = new LlmToolCall(
                    t.GetProperty("id").GetString() ?? Guid.NewGuid().ToString(),
                    "buscar_restaurantes",
                    fn.GetProperty("arguments").GetString() ?? "{}",
                    thoughtSignature);
            }
        }
        return new LlmTurn(content, tool);
    }

    // Gemini 3.x via endpoint OpenAI-compatible exige de volta o
    // extra_content.google.thought_signature no 2º turno ( functionCall parts ).
    private static object BuildToolCall(LlmToolCall call)
    {
        var dict = new Dictionary<string, object>
        {
            ["id"] = call.Id,
            ["type"] = "function",
            ["function"] = new { name = call.Name, arguments = call.Arguments },
        };
        if (!string.IsNullOrWhiteSpace(call.ThoughtSignature))
            dict["extra_content"] = new
            {
                google = new { thought_signature = call.ThoughtSignature },
            };
        return dict;
    }
}

public record LlmTurn(string? Content, LlmToolCall? ToolCall);
