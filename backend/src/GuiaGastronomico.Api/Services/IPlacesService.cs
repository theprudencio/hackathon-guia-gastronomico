using GuiaGastronomico.Api.Domain;

namespace GuiaGastronomico.Api.Services;

public interface IPlacesService
{
    Task<List<Restaurant>> SearchAsync(string query, double? lat, double? lng,
        int maxResults = 10, CancellationToken ct = default);

    // Rebusca só o campo photos (referências expiram). Retorna true se achou fotos.
    Task<bool> RefreshPhotosAsync(Guid restaurantId, CancellationToken ct = default);
}
