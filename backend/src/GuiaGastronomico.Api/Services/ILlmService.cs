namespace GuiaGastronomico.Api.Services;

// Provedor de LLM isolado (trocável). Conversa em formato OpenAI-compatible,
// com suporte a chamada de ferramenta.
public interface ILlmService
{
    bool IsConfigured { get; }
    Task<LlmTurn> ChatAsync(IReadOnlyList<LlmMsg> messages, CancellationToken ct = default);
}

public record LlmMsg(string Role, string? Content, string? ToolCallId = null, LlmToolCall? ToolCall = null);

public record LlmToolCall(string Id, string Name, string Arguments);
