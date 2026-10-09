using GuiaGastronomico.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace GuiaGastronomico.Api.Services;

// Ids de restaurantes favoritados pelo usuário (p/ preencher RestaurantDto.IsFavorite).
public class FavoriteService(AppDbContext db)
{
    public async Task<HashSet<Guid>> IdsAsync(Guid? userId, CancellationToken ct = default)
    {
        if (userId is null) return [];
        return (await db.Favorites.AsNoTracking()
            .Where(f => f.UserId == userId)
            .Select(f => f.RestaurantId)
            .ToListAsync(ct)).ToHashSet();
    }
}
