using System.Security.Claims;
using GuiaGastronomico.Api.Data;
using GuiaGastronomico.Api.Domain;
using GuiaGastronomico.Api.Dtos;
using GuiaGastronomico.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GuiaGastronomico.Api.Controllers;

[ApiController]
[Route("api/restaurants")]
[Authorize]
public class RestaurantsController(
    AppDbContext db,
    IPlacesService places,
    ReviewService reviews,
    FavoriteService favorites) : ControllerBase
{
    // Prévia p/ onboarding + debug (o chat usa o mesmo serviço).
    [HttpGet("search")]
    public async Task<ActionResult<List<RestaurantDto>>> Search(
        [FromQuery] string query = "restaurante",
        [FromQuery] double? lat = null,
        [FromQuery] double? lng = null,
        [FromQuery] int limit = 6,
        CancellationToken ct = default)
    {
        var results = await places.SearchAsync(query, lat, lng, Math.Clamp(limit, 1, 20), ct);
        return Ok(await ToDtosAsync(results, lat, lng, ct));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<RestaurantDto>> GetById(Guid id)
    {
        var r = await db.Restaurants.FirstOrDefaultAsync(x => x.Id == id);
        if (r is null) return NotFound(new { message = "Restaurante não encontrado." });
        return Ok((await ToDtosAsync([r], null, null)).Single());
    }

    // Em alta: ranking da comunidade (média das avaliações locais).
    // 3 por vez; excludeIds p/ o "ver mais" trazer outros 3 (substitui os atuais).
    [HttpGet("top-rated")]
    public async Task<ActionResult<List<RestaurantDto>>> TopRated(
        [FromQuery] int count = 3,
        [FromQuery] string? excludeIds = null,
        CancellationToken ct = default)
    {
        count = Math.Clamp(count, 1, 6);
        var excluded = (excludeIds ?? "")
            .Split(',', StringSplitOptions.RemoveEmptyEntries)
            .Select(s => Guid.TryParse(s.Trim(), out var g) ? (Guid?)g : null)
            .Where(g => g.HasValue)
            .Select(g => g!.Value)
            .ToList();

        var rankedIds = await db.Reviews
            .GroupBy(r => r.RestaurantId)
            .Select(g => new { Id = g.Key, Avg = g.Average(r => r.Stars), Count = g.Count() })
            .Where(x => !excluded.Contains(x.Id))
            .Join(db.Restaurants, x => x.Id, r => r.Id, (x, r) => new { R = r, x.Avg, x.Count })
            .OrderByDescending(x => x.Avg)
            .ThenByDescending(x => x.Count)
            .ThenByDescending(x => x.R.Rating ?? 0)
            .ThenBy(x => x.R.Name)
            .Take(count)
            .Select(x => x.R.Id)
            .ToListAsync(ct);

        var restaurants = await db.Restaurants
            .Where(r => rankedIds.Contains(r.Id))
            .ToListAsync(ct);
        var ordered = rankedIds
            .Join(restaurants, id => id, r => r.Id, (_, r) => r)
            .ToList();

        var me = CurrentUserId() is Guid uid
            ? await db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == uid, ct)
            : null;
        return Ok(await ToDtosAsync(ordered, me?.Latitude, me?.Longitude, ct));
    }

    private Guid? CurrentUserId() =>
        Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : null;

    private async Task<List<RestaurantDto>> ToDtosAsync(
        List<Restaurant> list, double? lat, double? lng, CancellationToken ct = default)
    {
        var stats = await reviews.StatsAsync(list.Select(r => r.Id), ct);
        var favs = await favorites.IdsAsync(CurrentUserId(), ct);
        return list.Select(r =>
        {
            stats.TryGetValue(r.Id, out var s);
            return new RestaurantDto(
                r.Id, r.PlaceId, r.Name, r.Address, r.Lat, r.Lng,
                r.Rating, r.PriceLevel, RestaurantDtoMapper.PhotosOf(r), r.Cuisines,
                lat.HasValue && lng.HasValue
                    ? Math.Round(Data.SeedRestaurants.GeoKm(lat.Value, lng.Value, r.Lat, r.Lng), 1)
                    : null,
                s.avg, s.count, favs.Contains(r.Id));
        }).ToList();
    }
}
