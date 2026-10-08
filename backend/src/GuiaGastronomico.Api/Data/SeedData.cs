using GuiaGastronomico.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace GuiaGastronomico.Api.Data;

// Demo funciona sem API externa: 2 usuários, ~15 restaurantes, 2 promoções ativas.
public static class SeedData
{
    public const string UserEmail = "user@demo.com";
    public const string AdvertiserEmail = "anunciante@demo.com";
    public const string DemoPassword = "demo123";

    public static async Task SeedAsync(AppDbContext db, CancellationToken ct = default)
    {
        if (!await db.Users.AnyAsync(u => u.Email == UserEmail, ct))
        {
            db.Users.Add(new User
            {
                Name = "Maria Demo", Email = UserEmail,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(DemoPassword),
                Role = Roles.User,
                Latitude = -23.5614, Longitude = -46.6550,
                LocationLabel = "Av. Paulista, São Paulo",
                Cuisines = [new UserCuisine { Cuisine = "japonesa" }, new UserCuisine { Cuisine = "pizza" }],
            });
        }
        if (!await db.Users.AnyAsync(u => u.Email == AdvertiserEmail, ct))
        {
            db.Users.Add(new User
            {
                Name = "Anunciante Demo", Email = AdvertiserEmail,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(DemoPassword),
                Role = Roles.Advertiser,
                Latitude = -23.5614, Longitude = -46.6550,
                LocationLabel = "Av. Paulista, São Paulo",
            });
        }
        await db.SaveChangesAsync(ct);

        foreach (var s in SeedRestaurants.All)
        {
            if (!await db.Restaurants.AnyAsync(r => r.PlaceId == s.PlaceId, ct))
            {
                db.Restaurants.Add(new Restaurant
                {
                    PlaceId = s.PlaceId, Name = s.Name, Address = s.Address,
                    Lat = s.Lat, Lng = s.Lng, Rating = s.Rating,
                    PriceLevel = s.PriceLevel, Cuisines = new List<string>(s.Cuisines),
                });
            }
        }
        await db.SaveChangesAsync(ct);

        if (!await db.Promotions.AnyAsync(ct))
        {
            var adv = await db.Users.FirstAsync(u => u.Email == AdvertiserEmail, ct);
            var sushi = await db.Restaurants.FirstAsync(r => r.PlaceId == "seed-tanaka", ct);
            var doces = await db.Restaurants.FirstAsync(r => r.PlaceId == "seed-doceria", ct);
            var now = DateTime.UtcNow;
            db.Promotions.AddRange(
                new Promotion
                {
                    RestaurantId = sushi.Id, AdvertiserId = adv.Id,
                    Title = "Festival do Sushi – 20% off",
                    Description = "Combinados e temakis com desconto esta semana.",
                    Plan = PromotionPlans.Weekly, Status = "Paid",
                    StartsAt = now.AddDays(-1), EndsAt = now.AddDays(6),
                },
                new Promotion
                {
                    RestaurantId = doces.Id, AdvertiserId = adv.Id,
                    Title = "Semana do Brigadeiro",
                    Description = "Brigadeiros gourmet e bolo de festa.",
                    Plan = PromotionPlans.Monthly, Status = "Paid",
                    StartsAt = now.AddDays(-2), EndsAt = now.AddDays(28),
                });
            await db.SaveChangesAsync(ct);
        }
    }
}
