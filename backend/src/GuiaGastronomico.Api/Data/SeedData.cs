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

        // Avaliadores seed: 5 usuários que avaliam os restaurantes do seed.
        // "Em alta" exibe o ranking da comunidade (média local).
        var reviewers = new[]
        {
            ("Ana Souza", "ana.avaliadora@demo.com"),
            ("Bruno Costa", "bruno.avaliador@demo.com"),
            ("Carla Mendes", "carla.avaliadora@demo.com"),
            ("Diego Alves", "diego.avaliador@demo.com"),
            ("Elisa Rocha", "elisa.avaliadora@demo.com"),
        };
        // placeId -> estrelas por avaliador (índice alinha com reviewers).
        var ratings = new Dictionary<string, int[]>
        {
            ["seed-doceria"] = new[] { 5, 5, 5, 5, 4 },
            ["seed-trattoria"] = new[] { 5, 5, 5, 4, 4 },
            ["seed-tanaka"] = new[] { 5, 5, 4, 4, 4 },
            ["seed-feijoada"] = new[] { 5, 5, 4, 3 },
            ["seed-forno"] = new[] { 5, 4, 4, 4, 3 },
            ["seed-veg"] = new[] { 5, 4, 4, 3 },
            ["seed-padaria"] = new[] { 4, 4, 4 },
            ["seed-saudavel"] = new[] { 4, 4, 4, 3 },
            ["seed-burger"] = new[] { 4, 4, 3 },
            ["seed-churras"] = new[] { 4, 4, 3 },
            ["seed-temaki"] = new[] { 4, 3, 3 },
            ["seed-taco"] = new[] { 3, 3, 4 },
            ["seed-acaraje"] = new[] { 4, 3, 2 },
            ["seed-beirute"] = new[] { 3, 3, 2 },
            ["seed-dragon"] = new[] { 3, 2, 3 },
        };
        // Comentários seed por estrela (rodízio p/ variar o texto).
        static string CommentFor(int stars, int salt) => stars switch
        {
            5 => new[]
            {
                "Comida impecável, voltarei com certeza!",
                "Melhor da região, atendimento nota 10!",
                "Prato delicioso e muito bem servido. Recomendo!",
                "Experiência perfeita do início ao fim!",
                "Sabor incrível, virou meu favorito!",
            }[salt % 5],
            4 => new[]
            {
                "Muito bom, só a espera foi um pouco longa.",
                "Ótima comida e preço justo.",
                "Gostei bastante, voltarei em breve.",
                "Pratos saborosos e ambiente agradável.",
            }[salt % 4],
            3 => new[]
            {
                "Razoável, nada de especial.",
                "Comida ok, mas já comi melhor por aqui.",
                "Mediano — atende, sem surpreender.",
            }[salt % 3],
            _ => new[]
            {
                "Deixou a desejar, esperava mais.",
                "Atendimento demorado e prato morno.",
            }[salt % 2],
        };
        for (var i = 0; i < reviewers.Length; i++)
        {
            var (name, email) = reviewers[i];
            var reviewer = await db.Users.FirstOrDefaultAsync(u => u.Email == email, ct);
            if (reviewer is null)
            {
                reviewer = new User
                {
                    Name = name, Email = email,
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword(DemoPassword),
                    Role = Roles.User,
                    Latitude = -23.5614, Longitude = -46.6550,
                    LocationLabel = "Av. Paulista, São Paulo",
                };
                db.Users.Add(reviewer);
                await db.SaveChangesAsync(ct);
            }
            // 1 avaliação por usuário/restaurante (com comentário);
            // preenche quem ainda não avaliou e completa comentários vazios do seed antigo.
            var salt = 0;
            foreach (var (placeId, stars) in ratings)
            {
                if (i >= stars.Length) continue;
                var restaurant = await db.Restaurants.FirstOrDefaultAsync(r => r.PlaceId == placeId, ct);
                if (restaurant is null) continue;
                var existing = await db.Reviews
                    .FirstOrDefaultAsync(r => r.UserId == reviewer.Id && r.RestaurantId == restaurant.Id, ct);
                if (existing is null)
                {
                    db.Reviews.Add(new Review
                    {
                        UserId = reviewer.Id,
                        RestaurantId = restaurant.Id,
                        Stars = stars[i],
                        Comment = CommentFor(stars[i], i + salt++),
                    });
                }
                else if (string.IsNullOrWhiteSpace(existing.Comment))
                {
                    existing.Comment = CommentFor(existing.Stars, i + salt++);
                }
            }
            await db.SaveChangesAsync(ct);
        }

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
