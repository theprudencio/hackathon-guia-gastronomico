namespace GuiaGastronomico.Api.Options;

public class LlmOptions
{
    public const string Section = "Llm";
    public string ApiKey { get; set; } = string.Empty;
    public string Model { get; set; } = "gpt-4o-mini";
    public string BaseUrl { get; set; } = "https://api.openai.com/v1";
}
