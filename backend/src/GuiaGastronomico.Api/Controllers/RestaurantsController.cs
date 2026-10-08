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
    ReviewService reviews) : ControllerBase
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

    private async Task<List<RestaurantDto>> ToDtosAsync(
        List<Restaurant> list, double? lat, double? lng, CancellationToken ct = default)
    {
        var stats = await reviews.StatsAsync(list.Select(r => r.Id), ct);
        return list.Select(r =>
        {
            stats.TryGetValue(r.Id, out var s);
            return new RestaurantDto(
                r.Id, r.PlaceId, r.Name, r.Address, r.Lat, r.Lng,
                r.Rating, r.PriceLevel, RestaurantDtoMapper.PhotosOf(r), r.Cuisines,
                lat.HasValue && lng.HasValue
                    ? Math.Round(Data.SeedRestaurants.GeoKm(lat.Value, lng.Value, r.Lat, r.Lng), 1)
                    : null,
                s.avg, s.count);
        }).ToList();
    }
}
