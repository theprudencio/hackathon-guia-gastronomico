using GuiaGastronomico.Api.Domain;

namespace GuiaGastronomico.Api.Services;

public interface IOpeningHoursService
{
    /// <summary>Preenche OpenNow/OpeningHours das entidades que ainda não têm (seeds + Google ao vivo).</summary>
    Task EnrichAsync(List<Restaurant> list, CancellationToken ct = default);
}
