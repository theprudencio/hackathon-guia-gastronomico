using System.Security.Claims;
using GuiaGastronomico.Api.Data;
using GuiaGastronomico.Api.Dtos;
using GuiaGastronomico.Api.Domain;
using GuiaGastronomico.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GuiaGastronomico.Api.Controllers;

[ApiController]
[Route("api/favorites")]
[Authorize]
public class FavoritesController(AppDbContext db, IOpeningHoursService hours, ReviewService reviews) : ControllerBase
{
    private Guid? CurrentUserId() =>
        Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : null;

    // Favoritos do usuário, mais recentes primeiro.
    [HttpGet]
    public async Task<ActionResult<List<RestaurantDto>>> List(CancellationToken ct)
    {
        var userId = CurrentUserId();
        if (userId is null) return Unauthorized();

        var favs = await db.Favorites.AsNoTracking()
            .Where(f => f.UserId == userId)
            .Include(f => f.Restaurant)
            .OrderByDescending(f => f.CreatedAt)
            .ToListAsync(ct);

        var user = await db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId, ct);
        var restaurants = favs.Select(f => f.Restaurant!).Where(r => r is not null).ToList();
        var stats = await reviews.StatsAsync(restaurants.Select(r => r.Id), ct);
        await hours.EnrichAsync(restaurants, ct);

        return Ok(restaurants.Select(r =>
        {
            stats.TryGetValue(r.Id, out var s);
            return new RestaurantDto(
                r.Id, r.PlaceId, r.Name, r.Address, r.Lat, r.Lng,
                r.Rating, r.PriceLevel, RestaurantDtoMapper.PhotosOf(r), r.Cuisines,
                user?.Latitude.HasValue == true && user?.Longitude.HasValue == true
                    ? Math.Round(SeedRestaurants.GeoKm(user!.Latitude!.Value, user.Longitude!.Value, r.Lat, r.Lng), 1)
                    : null,
                s.avg, s.count, IsFavorite: true,
                OpenNow: r.OpenNow, OpeningHours: RestaurantDtoMapper.HoursOf(r.OpeningHours));
        }).ToList());
    }

    // Idempotente: favoritar duas vezes não duplica.
    [HttpPost("{restaurantId:guid}")]
    public async Task<ActionResult> Add(Guid restaurantId, CancellationToken ct)
    {
        var userId = CurrentUserId();
        if (userId is null) return Unauthorized();
        if (!await db.Restaurants.AnyAsync(r => r.Id == restaurantId, ct))
            return NotFound(new { message = "Restaurante não encontrado." });

        var exists = await db.Favorites.AnyAsync(
            f => f.UserId == userId && f.RestaurantId == restaurantId, ct);
        if (!exists)
        {
            db.Favorites.Add(new Favorite { UserId = userId.Value, RestaurantId = restaurantId });
            await db.SaveChangesAsync(ct);
        }
        return Ok(new { favorited = true });
    }

    // Idempotente: desfavoritar o que não é favorito continua 204.
    [HttpDelete("{restaurantId:guid}")]
    public async Task<ActionResult> Remove(Guid restaurantId, CancellationToken ct)
    {
        var userId = CurrentUserId();
        if (userId is null) return Unauthorized();

        var fav = await db.Favorites.FirstOrDefaultAsync(
            f => f.UserId == userId && f.RestaurantId == restaurantId, ct);
        if (fav is not null)
        {
            db.Favorites.Remove(fav);
            await db.SaveChangesAsync(ct);
        }
        return NoContent();
    }
}
