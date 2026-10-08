using System.ComponentModel.DataAnnotations;
using GuiaGastronomico.Api.Domain;

namespace GuiaGastronomico.Api.Dtos;

public record NewRestaurantInput(
    [Required, MaxLength(200)] string Name,
    [Required, MaxLength(500)] string Address,
    double? Lat,
    double? Lng,
    List<string>? Cuisines);

public record CreatePromotionRequest(
    [Required, MaxLength(120)] string Title,
    [MaxLength(500)] string? Description,
    string? Plan,
    Guid? RestaurantId,
    NewRestaurantInput? NewRestaurant);

public record PromotionDto(
    Guid Id,
    string Title,
    string? Description,
    string Plan,
    string PlanLabel,
    string Status,
    DateTime StartsAt,
    DateTime EndsAt,
    string AdvertiserName,
    RestaurantDto Restaurant);
