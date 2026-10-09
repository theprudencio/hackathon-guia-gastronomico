using System.ComponentModel.DataAnnotations;
using GuiaGastronomico.Api.Domain;

namespace GuiaGastronomico.Api.Dtos;

public record UpdatePreferencesRequest(
    [Range(-90, 90)] double? Latitude,
    [Range(-180, 180)] double? Longitude,
    [MaxLength(300)] string? LocationLabel,
    List<string> Cuisines);

public record PhotoDto(string Url, string? AuthorName);

public record RestaurantDto(
    Guid Id,
    string PlaceId,
    string Name,
    string Address,
    double Lat,
    double Lng,
    double? Rating,
    int? PriceLevel,
    List<PhotoDto> Photos,
    List<string> Cuisines,
    double? DistanceKm,
    double? AvgStars,
    int ReviewsCount,
    bool IsFavorite = false);

public static class RestaurantDtoMapper
{
    // URLs apontam p/ o proxy; sem fotos, 1 slot p/ o proxy redirecionar à imagem de exemplo.
    public static List<PhotoDto> PhotosOf(Restaurant r)
    {
        var stored = (r.Photos ?? []).Where(p => !string.IsNullOrEmpty(p.Name)).Take(3).ToList();
        if (stored.Count > 0)
            return stored.Select((p, i) =>
                new PhotoDto($"/api/restaurants/{r.Id}/photos/{i}?w=600", p.AuthorName)).ToList();
        return [new PhotoDto($"/api/restaurants/{r.Id}/photos/0?w=600", null)];
    }
}
