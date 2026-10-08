using System.ComponentModel.DataAnnotations;

namespace GuiaGastronomico.Api.Dtos;

public record RegisterRequest(
    [Required, MaxLength(120)] string Name,
    [Required, EmailAddress, MaxLength(200)] string Email,
    [Required, MinLength(6), MaxLength(100)] string Password,
    string? Role);

public record LoginRequest(
    [Required, EmailAddress] string Email,
    [Required] string Password);

public record AuthResponse(
    string Token,
    UserDto User);

public record UserDto(
    Guid Id,
    string Name,
    string Email,
    string Role,
    double? Latitude,
    double? Longitude,
    string? LocationLabel,
    List<string> Cuisines);
