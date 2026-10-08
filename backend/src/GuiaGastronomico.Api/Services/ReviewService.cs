using GuiaGastronomico.Api.Data;
using GuiaGastronomico.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace GuiaGastronomico.Api.Services;

// Upsert de avaliação (1 por usuário/restaurante) + agregados.
public class ReviewService(AppDbContext db)
{
    public async Task<Review> UpsertAsync(Guid userId, Guid restaurantId, int stars, string? comment, CancellationToken ct = default)
    {
        var existing = await db.Reviews
            .FirstOrDefaultAsync(r => r.UserId == userId && r.RestaurantId == restaurantId, ct);
        if (existing is null)
        {
            existing = new Review
            {
                UserId = userId,
                RestaurantId = restaurantId,
                Stars = stars,
                Comment = string.IsNullOrWhiteSpace(comment) ? null : comment.Trim(),
            };
            db.Reviews.Add(existing);
        }
        else
        {
            existing.Stars = stars;
            existing.Comment = string.IsNullOrWhiteSpace(comment) ? null : comment.Trim();
            existing.CreatedAt = DateTime.UtcNow;
        }
        await db.SaveChangesAsync(ct);
        return existing;
    }

    // Média local + contagem por restaurante em 1 query.
    public async Task<Dictionary<Guid, (double? avg, int count)>> StatsAsync(IEnumerable<Guid> ids, CancellationToken ct = default)
    {
        var list = ids.Distinct().ToList();
        if (list.Count == 0) return new();
        return await db.Reviews.Where(r => list.Contains(r.RestaurantId))
            .GroupBy(r => r.RestaurantId)
            .Select(g => new { Id = g.Key, Avg = g.Average(r => r.Stars), Count = g.Count() })
            .ToDictionaryAsync(x => x.Id, x => ((double?)Math.Round(x.Avg, 1), x.Count), ct);
    }
}
