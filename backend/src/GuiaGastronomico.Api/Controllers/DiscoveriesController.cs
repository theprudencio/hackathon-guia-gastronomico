using System.Security.Claims;
using GuiaGastronomico.Api.Data;
using GuiaGastronomico.Api.Dtos;
using GuiaGastronomico.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GuiaGastronomico.Api.Controllers;

[ApiController]
[Route("api/discoveries")]
[Authorize]
public class DiscoveriesController(
    AppDbContext db,
    DiscoveryService discoveries,
    IOpeningHoursService hours,
    ReviewService reviews,
    FavoriteService favorites) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<List<RestaurantDto>>> Get(
        [FromQuery] int count = 3,
        [FromQuery] string? excludeIds = null,
        CancellationToken ct = default)
    {
        if (!Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var userId))
            return Unauthorized();

        var excluded = (excludeIds ?? "")
            .Split(',', StringSplitOptions.RemoveEmptyEntries)
            .Select(s => Guid.TryParse(s.Trim(), out var g) ? (Guid?)g : null)
            .Where(g => g.HasValue)
            .Select(g => g!.Value)
            .ToList();

        var list = await discoveries.GetAsync(userId, excluded, count, ct);
        var user = await db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId, ct);
        var stats = await reviews.StatsAsync(list.Select(r => r.Id), ct);
        var favs = await favorites.IdsAsync(userId, ct);
        await hours.EnrichAsync(list, ct);

        return Ok(list.Select(r =>
        {
            stats.TryGetValue(r.Id, out var s);
            return new RestaurantDto(
                r.Id, r.PlaceId, r.Name, r.Address, r.Lat, r.Lng,
                r.Rating, r.PriceLevel, RestaurantDtoMapper.PhotosOf(r), r.Cuisines,
                user?.Latitude.HasValue == true && user?.Longitude.HasValue == true
                    ? Math.Round(SeedRestaurants.GeoKm(user!.Latitude!.Value, user.Longitude!.Value, r.Lat, r.Lng), 1)
                    : null,
                s.avg, s.count, favs.Contains(r.Id),
                r.OpenNow, RestaurantDtoMapper.HoursOf(r.OpeningHours));
        }).ToList());
    }
}
