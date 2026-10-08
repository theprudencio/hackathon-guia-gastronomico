using System.ComponentModel.DataAnnotations;

namespace GuiaGastronomico.Api.Dtos;

public record CreateReviewRequest(
    [Range(1, 5)] int Stars,
    [MaxLength(280)] string? Comment);

public record ReviewDto(
    Guid Id,
    string UserName,
    int Stars,
    string? Comment,
    DateTime CreatedAt);
