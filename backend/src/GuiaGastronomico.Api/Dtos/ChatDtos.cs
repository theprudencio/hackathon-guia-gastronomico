using System.ComponentModel.DataAnnotations;

namespace GuiaGastronomico.Api.Dtos;

public record ChatHistoryMsg(string Role, string Text);

public record ChatRequest(
    [Required, MinLength(1), MaxLength(500)] string Message,
    double? Lat,
    double? Lng,
    List<ChatHistoryMsg>? History);

public record ChatResponse(
    string Reply,
    List<RestaurantDto> Restaurants);
