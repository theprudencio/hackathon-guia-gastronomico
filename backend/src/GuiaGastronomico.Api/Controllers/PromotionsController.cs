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
[Route("api/promotions")]
public class PromotionsController(AppDbContext db, ReviewService reviews, FavoriteService favorites) : ControllerBase
{
    [HttpGet]
    [AllowAnonymous]
    public async Task<ActionResult<List<PromotionDto>>> List(CancellationToken ct)
    {
        var now = DateTime.UtcNow;
        var items = await db.Promotions.Active(now)
            .Include(p => p.Restaurant)
            .Include(p => p.Advertiser)
            .OrderByDescending(p => p.StartsAt)
            .ToListAsync(ct);
        var stats = await reviews.StatsAsync(items.Select(i => i.RestaurantId), ct);
        Guid? userId = Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : null;
        var favs = await favorites.IdsAsync(userId, ct);
        return Ok(items.Select(p => ToDto(p, stats, favs)).ToList());
    }

    // Checkout SIMULADO: grava Status = Paid direto.
    [HttpPost]
    [Authorize(Roles = Roles.Advertiser)]
    public async Task<ActionResult<PromotionDto>> Create([FromBody] CreatePromotionRequest req, CancellationToken ct)
    {
        if (!ModelState.IsValid) return ValidationProblem(ModelState);
        if (!Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var advertiserId))
            return Unauthorized();

        Restaurant? restaurant = null;
        if (req.RestaurantId.HasValue)
            restaurant = await db.Restaurants.FirstOrDefaultAsync(r => r.Id == req.RestaurantId, ct);

        if (restaurant is null && req.NewRestaurant is not null)
        {
            var nr = req.NewRestaurant;
            restaurant = new Restaurant
            {
                PlaceId = $"adv-{Guid.NewGuid():N}",
                Name = nr.Name.Trim(),
                Address = nr.Address.Trim(),
                Lat = nr.Lat ?? 0,
                Lng = nr.Lng ?? 0,
                Cuisines = (nr.Cuisines ?? [])
                    .Select(c => c.Trim().ToLowerInvariant())
                    .Where(c => c.Length is >= 2 and <= 60).Distinct().Take(5).ToList(),
                CachedAt = DateTime.UtcNow,
            };
            db.Restaurants.Add(restaurant);
        }

        if (restaurant is null)
            return BadRequest(new { message = "Informe restaurantId existente ou newRestaurant." });

        var plan = req.Plan == PromotionPlans.Monthly ? PromotionPlans.Monthly : PromotionPlans.Weekly;
        var promo = new Promotion
        {
            RestaurantId = restaurant.Id,
            AdvertiserId = advertiserId,
            Title = req.Title.Trim(),
            Description = req.Description?.Trim() ?? "",
            Plan = plan,
            Status = "Paid",
            StartsAt = DateTime.UtcNow,
            EndsAt = DateTime.UtcNow.AddDays(PromotionPlans.Days(plan)),
        };
        db.Promotions.Add(promo);
        await db.SaveChangesAsync(ct);

        await db.Entry(promo).Reference(p => p.Restaurant).LoadAsync(ct);
        var advertiser = await db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == advertiserId, ct);
        promo.Advertiser = advertiser;
        var stats = await reviews.StatsAsync([restaurant.Id], ct);
        var favs = await favorites.IdsAsync(advertiserId, ct);
        return Created($"/api/promotions/{promo.Id}", ToDto(promo, stats, favs));
    }

    private static PromotionDto ToDto(Promotion p, Dictionary<Guid, (double? avg, int count)> stats, HashSet<Guid> favs)
    {
        var r = p.Restaurant!;
        stats.TryGetValue(r.Id, out var s);
        return new PromotionDto(
            p.Id, p.Title, p.Description, p.Plan, PromotionPlans.Label(p.Plan),
            p.Status, p.StartsAt, p.EndsAt, p.Advertiser?.Name ?? "Anunciante",
            new RestaurantDto(r.Id, r.PlaceId, r.Name, r.Address, r.Lat, r.Lng,
                r.Rating, r.PriceLevel, RestaurantDtoMapper.PhotosOf(r), r.Cuisines, null, s.avg, s.count, favs.Contains(r.Id)));
    }
}
