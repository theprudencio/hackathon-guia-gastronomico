namespace GuiaGastronomico.Api.Options;

public class GoogleOptions
{
    public const string Section = "Google";
    public string ApiKey { get; set; } = string.Empty;
    public int CacheHours { get; set; } = 12;
}
