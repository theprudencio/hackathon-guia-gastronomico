using System.ComponentModel.DataAnnotations;
using GuiaGastronomico.Api.Domain;

namespace GuiaGastronomico.Api.Dtos;

public record UpdatePreferencesRequest(
    [Range(-90, 90)] double? Latitude,
    [Range(-180, 180)] double? Longitude,
    [MaxLength(300)] string? LocationLabel,
    List<string> Cuisines);

public record PhotoDto(string Url, string? AuthorName);

/// <summary>Um dia de funcionamento. Day: "seg".."dom". Hours: "11:30–23:00", "24 horas" ou "Fechado".</summary>
public record OpeningDayDto(string Day, string Hours);

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
    bool IsFavorite = false,
    bool? OpenNow = null,
    List<OpeningDayDto>? OpeningHours = null);

public static class RestaurantDtoMapper
{
    private static readonly string[] DayLabels = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

    // seg..dom; dias sem período viram "Fechado".
    public static List<OpeningDayDto> HoursOf(List<DayHours> hours)
    {
        var byDay = hours
            .Where(h => h.Day is >= 0 and <= 6)
            .GroupBy(h => h.Day)
            .ToDictionary(g => g.Key, g => g.ToList());
        var order = new[] { 1, 2, 3, 4, 5, 6, 0 };
        return order.Select(d =>
        {
            if (!byDay.TryGetValue(d, out var list) || list.Count == 0)
                return new OpeningDayDto(DayLabels[d], "Fechado");
            var parts = list.Select(h =>
                h.Opens is null || h.Closes is null ? "24 horas" : $"{h.Opens}–{h.Closes}");
            return new OpeningDayDto(DayLabels[d], string.Join(" · ", parts));
        }).ToList();
    }
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
