namespace GuiaGastronomico.Api.Options;

public class JwtOptions
{
    public const string Section = "Jwt";
    public string Secret { get; set; } = string.Empty;
    public string Issuer { get; set; } = "guia-gastronomico";
    public string Audience { get; set; } = "guia-gastronomico";
    public int ExpiresMinutes { get; set; } = 60 * 24 * 7;
}
