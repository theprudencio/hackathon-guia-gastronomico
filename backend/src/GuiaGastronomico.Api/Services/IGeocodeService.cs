namespace GuiaGastronomico.Api.Services;

public interface IGeocodeService
{
    /// <returns>"Cidade, UF" ou null se não der p/ resolver.</returns>
    Task<string?> ReverseAsync(double lat, double lng, CancellationToken ct = default);
}
