using GuiaGastronomico.Api.Domain;
using GuiaGastronomico.Api.Dtos;

namespace GuiaGastronomico.Api.Services;

public interface IOpeningHoursService
{
    /// <summary>Preenche OpenNow/OpeningHours das entidades que ainda não têm (seeds + Google ao vivo).</summary>
    Task EnrichAsync(List<Restaurant> list, CancellationToken ct = default);

    /// <summary>Avaliações do Google Maps (até 5). Vazio p/ seeds/sem chave/falha.</summary>
    Task<List<GoogleReviewDto>> GetGoogleReviewsAsync(string placeId, CancellationToken ct = default);
}
