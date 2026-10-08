using System.Text.Json;
using GuiaGastronomico.Api.Data;
using GuiaGastronomico.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace GuiaGastronomico.Api.Services;

// 3-4 recomendações/semana: gostos + culinárias bem avaliadas (>=4), via Places.
public class DiscoveryService(AppDbContext db, IPlacesService places, ILogger<DiscoveryService> logger)
{
    public async Task<List<Restaurant>> GetAsync(Guid userId, CancellationToken ct = default)
    {
        var weekStart = WeekStartUtc(DateTime.UtcNow);

        var cache = await db.DiscoveryCaches.FirstOrDefaultAsync(c => c.UserId == userId, ct);
        if (cache is not null && cache.CreatedAt >= weekStart)
        {
            var ids = JsonSerializer.Deserialize<List<Guid>>(cache.RestaurantIdsJson) ?? [];
            if (ids.Count > 0)
            {
                var kept = await db.Restaurants.Where(r => ids.Contains(r.Id)).ToListAsync(ct);
                if (kept.Count > 0)
                {
                    logger.LogInformation("Discoveries cache hit p/ {User}", userId);
                    return ids.Join(kept, id => id, r => r.Id, (_, r) => r).ToList();
                }
            }
        }

        var user = await db.Users.Include(u => u.Cuisines)
            .FirstOrDefaultAsync(u => u.Id == userId, ct);
        if (user is null) return [];

        var tastes = user.Cuisines.Select(c => c.Cuisine).ToList();
        var reviewedIds = await db.Reviews.Where(r => r.UserId == userId)
            .Select(r => r.RestaurantId).ToListAsync(ct);
        var likedCuisines = await db.Reviews
            .Where(r => r.UserId == userId && r.Stars >= 4)
            .Join(db.Restaurants, r => r.RestaurantId, rest => rest.Id, (_, rest) => rest.Cuisines)
            .ToListAsync(ct);

        var queries = tastes
            .Concat(likedCuisines.SelectMany(c => c))
            .Select(c => c.Trim().ToLowerInvariant())
            .Where(c => c.Length >= 2)
            .GroupBy(c => c)
            .OrderByDescending(g => g.Count())
            .Select(g => g.Key)
            .Take(3)
            .ToList();
        if (queries.Count == 0) queries.Add("restaurante");

        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var all = new List<Restaurant>();
        foreach (var q in queries)
        {
            var res = await places.SearchAsync(q, user.Latitude, user.Longitude, 4, ct);
            foreach (var r in res)
            {
                if (seen.Add(r.PlaceId) && !reviewedIds.Contains(r.Id)) all.Add(r);
            }
        }

        var picked = all
            .OrderByDescending(r => r.Rating ?? 0)
            .ThenBy(r => user.Latitude.HasValue && user.Longitude.HasValue
                ? SeedRestaurants.GeoKm(user.Latitude.Value, user.Longitude.Value, r.Lat, r.Lng)
                : 0)
            .Take(4)
            .ToList();

        // Completa até 3 com os melhores ainda não avaliados (cobre base esparsa).
        if (picked.Count < 3)
        {
            var pickedIds = picked.Select(r => r.Id).ToHashSet();
            var extra = (await db.Restaurants.OrderByDescending(r => r.Rating).Take(20).ToListAsync(ct))
                .Where(r => !reviewedIds.Contains(r.Id) && !pickedIds.Contains(r.Id))
                .Where(r => !user.Latitude.HasValue || !user.Longitude.HasValue
                    || SeedRestaurants.GeoKm(user.Latitude.Value, user.Longitude.Value, r.Lat, r.Lng) <= 10)
                .Take(3 - picked.Count);
            picked.AddRange(extra);
            picked = picked.OrderByDescending(r => r.Rating ?? 0).Take(4).ToList();
        }

        db.DiscoveryCaches.RemoveRange(db.DiscoveryCaches.Where(c => c.UserId == userId));
        db.DiscoveryCaches.Add(new DiscoveryCache
        {
            UserId = userId,
            RestaurantIdsJson = JsonSerializer.Serialize(picked.Select(r => r.Id).ToList()),
        });
        await db.SaveChangesAsync(ct);

        return picked;
    }

    internal static DateTime WeekStartUtc(DateTime now)
    {
        // Segunda-feira 00:00 UTC.
        var daysSinceMonday = ((int)now.DayOfWeek + 6) % 7;
        return now.Date.AddDays(-daysSinceMonday);
    }
}
