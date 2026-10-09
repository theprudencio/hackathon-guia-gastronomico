using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using GuiaGastronomico.Api.Data;
using GuiaGastronomico.Api.Domain;
using GuiaGastronomico.Api.Options;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace GuiaGastronomico.Api.Services;

public class PlacesService(
    HttpClient http,
    AppDbContext db,
    IOptions<GoogleOptions> options,
    ILogger<PlacesService> logger) : IPlacesService
{
    private const string Endpoint = "https://places.googleapis.com/v1/places:searchText";
    private const string FieldMask = "places.displayName,places.formattedAddress,places.location,places.rating,places.priceLevel,places.photos,places.types,places.id,places.regularOpeningHours";

    private static readonly Dictionary<string, string> TypeToCuisine = new(StringComparer.OrdinalIgnoreCase)
    {
        ["japanese_restaurant"] = "japonesa",
        ["sushi_restaurant"] = "japonesa",
        ["ramen_restaurant"] = "japonesa",
        ["mexican_restaurant"] = "mexicana",
        ["taco_restaurant"] = "mexicana",
        ["italian_restaurant"] = "italiana",
        ["pizza_restaurant"] = "pizza",
        ["brazilian_restaurant"] = "brasileira",
        ["churrascaria"] = "brasileira",
        ["chinese_restaurant"] = "chinesa",
        ["vegetarian_restaurant"] = "vegetariana",
        ["vegan_restaurant"] = "vegetariana",
        ["dessert_restaurant"] = "doces",
        ["dessert_shop"] = "doces",
        ["bakery"] = "doces",
        ["cafe"] = "cafés",
        ["coffee_shop"] = "cafés",
        ["sandwich_shop"] = "lanches",
        ["hamburger_restaurant"] = "lanches",
        ["middle_eastern_restaurant"] = "árabe",
    };

    public async Task<List<Restaurant>> SearchAsync(string query, double? lat, double? lng,
        int maxResults = 10, CancellationToken ct = default)
    {
        query = (query ?? "").Trim();
        if (query.Length == 0) query = "restaurante";
        maxResults = Math.Clamp(maxResults, 1, 20);
        var validity = DateTime.UtcNow.AddHours(-Math.Max(1, options.Value.CacheHours));

        // 1. Cache fresco no banco
        try
        {
            var cached = await db.Restaurants
                .Where(r => r.CachedAt >= validity)
                .OrderByDescending(r => r.Rating)
                .Take(300)
                .ToListAsync(ct);
            var hits = FilterLocal(cached, query, lat, lng).Take(maxResults).ToList();
            if (hits.Count >= Math.Min(maxResults, 3))
            {
                logger.LogInformation("Places cache hit: {Count} p/ '{Query}'", hits.Count, query);
                return hits;
            }
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Falha ao ler cache de restaurantes.");
        }

        // 2. Sem chave -> fallback direto
        var key = options.Value.ApiKey;
        if (string.IsNullOrWhiteSpace(key))
        {
            logger.LogInformation("GOOGLE_PLACES_KEY ausente, usando fallback.");
            return Fallback(query, lat, lng, maxResults);
        }

        // 3. Chama Google Places (New) Text Search
        try
        {
            using var req = new HttpRequestMessage(HttpMethod.Post, Endpoint);
            req.Headers.Add("X-Goog-Api-Key", key);
            req.Headers.Add("X-Goog-FieldMask", FieldMask);
            req.Content = new StringContent(BuildBody(query, lat, lng, maxResults),
                Encoding.UTF8, "application/json");

            using var res = await http.SendAsync(req, ct);
            if (!res.IsSuccessStatusCode)
            {
                logger.LogWarning("Places API {Status}, usando fallback.", (int)res.StatusCode);
                return Fallback(query, lat, lng, maxResults);
            }

            var json = await res.Content.ReadAsStringAsync(ct);
            var places = Parse(json, query);
            if (places.Count == 0) return Fallback(query, lat, lng, maxResults);

            await UpsertAsync(places, ct);
            return places.Take(maxResults).ToList();
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Places API falhou, usando fallback.");
            return Fallback(query, lat, lng, maxResults);
        }
    }

    private List<Restaurant> Fallback(string query, double? lat, double? lng, int max)
    {
        // Tenta cache antigo antes do seed estático
        try
        {
            var stale = db.Restaurants.OrderByDescending(r => r.Rating).Take(300).ToList();
            var hits = FilterLocal(stale, query, lat, lng).Take(max).ToList();
            if (hits.Count > 0) return hits;
        }
        catch { /* ignora, vai p/ seed */ }
        return SeedRestaurants.Filter(query, lat, lng, max);
    }

    private static List<Restaurant> FilterLocal(List<Restaurant> source, string query, double? lat, double? lng)
    {
        var terms = Data.SeedRestaurants.Norm(query).Split([' ', ',', '+'], StringSplitOptions.RemoveEmptyEntries)
            .Where(t => t.Length >= 3).ToArray();
        return source
            .Select(r => new
            {
                R = r,
                D = lat.HasValue && lng.HasValue ? SeedRestaurants.GeoKm(lat.Value, lng.Value, r.Lat, r.Lng) : (double?)null,
            })
            .Where(x => terms.Length == 0 || terms.Any(t =>
                Data.SeedRestaurants.Norm(x.R.Name).Contains(t)
                || Data.SeedRestaurants.Norm(x.R.Address).Contains(t)
                || x.R.Cuisines.Any(c =>
                    Data.SeedRestaurants.Norm(c).Contains(t) || t.Contains(Data.SeedRestaurants.Norm(c)))))
            .Where(x => x.D is null || x.D <= 10)
            .OrderBy(x => x.D ?? 5)
            .ThenByDescending(x => x.R.Rating)
            .Select(x => x.R)
            .ToList();
    }

    private static string BuildBody(string query, double? lat, double? lng, int max)
    {
        object body = (lat.HasValue && lng.HasValue)
            ? new
            {
                textQuery = query,
                maxResultCount = max,
                locationBias = new
                {
                    circle = new
                    {
                        center = new { latitude = lat.Value, longitude = lng.Value },
                        radius = 3000.0,
                    },
                },
            }
            : new { textQuery = query, maxResultCount = max };
        return JsonSerializer.Serialize(body);
    }

    private static List<Restaurant> Parse(string json, string query)
    {
        var list = new List<Restaurant>();
        using var doc = JsonDocument.Parse(json);
        if (!doc.RootElement.TryGetProperty("places", out var places)) return list;
        foreach (var p in places.EnumerateArray())
        {
            try
            {
                var placeId = p.TryGetProperty("id", out var id) ? id.GetString() ?? Guid.NewGuid().ToString() : Guid.NewGuid().ToString();
                var name = p.TryGetProperty("displayName", out var dn) && dn.TryGetProperty("text", out var t)
                    ? t.GetString() ?? "Sem nome" : "Sem nome";
                var address = p.TryGetProperty("formattedAddress", out var fa) ? fa.GetString() ?? "" : "";
                var loc = p.GetProperty("location");
                var rLat = loc.GetProperty("latitude").GetDouble();
                var rLng = loc.GetProperty("longitude").GetDouble();
                double? rating = p.TryGetProperty("rating", out var rt) ? rt.GetDouble() : null;
                int? price = p.TryGetProperty("priceLevel", out var pl) ? MapPrice(pl.GetString()) : null;
                var types = p.TryGetProperty("types", out var ty)
                    ? ty.EnumerateArray().Select(x => x.GetString() ?? "").ToList() : new();
                bool? openNow = null;
                List<DayHours> hours = new();
                if (p.TryGetProperty("regularOpeningHours", out var roh))
                {
                    openNow = roh.TryGetProperty("openNow", out var on) ? on.GetBoolean() : null;
                    hours = OpeningHoursService.ParsePeriods(roh);
                    openNow ??= hours.Count > 0 ? OpeningHoursService.IsOpenNow(hours) : null;
                }
                list.Add(new Restaurant
                {
                    PlaceId = placeId,
                    Name = name,
                    Address = address,
                    Lat = rLat,
                    Lng = rLng,
                    Rating = rating,
                    PriceLevel = price,
                    Photos = ParsePhotos(p),
                    Cuisines = MapCuisines(types, query),
                    CachedAt = DateTime.UtcNow,
                    OpenNow = openNow,
                    OpeningHours = hours,
                });
            }
            catch { /* pula item malformado */ }
        }
        return list;
    }

    private static List<RestaurantPhoto> ParsePhotos(JsonElement place)
    {
        var photos = new List<RestaurantPhoto>();
        if (!place.TryGetProperty("photos", out var arr)) return photos;
        foreach (var ph in arr.EnumerateArray().Take(3))
        {
            var name = ph.TryGetProperty("name", out var n) ? n.GetString() ?? "" : "";
            if (name.Length == 0) continue;
            string? authorName = null, authorUri = null;
            if (ph.TryGetProperty("authorAttributions", out var aa) && aa.GetArrayLength() > 0)
            {
                var a0 = aa[0];
                authorName = a0.TryGetProperty("displayName", out var d) ? d.GetString() : null;
                authorUri = a0.TryGetProperty("uri", out var u) ? u.GetString() : null;
            }
            photos.Add(new RestaurantPhoto { Name = name, AuthorName = authorName, AuthorUri = authorUri });
        }
        return photos;
    }

    public async Task<bool> RefreshPhotosAsync(Guid restaurantId, CancellationToken ct = default)
    {
        logger.LogInformation("Refresh de fotos acionado p/ restaurante {Id}", restaurantId);
        var r = await db.Restaurants.FirstOrDefaultAsync(x => x.Id == restaurantId, ct);
        if (r is null) return false;
        var key = options.Value.ApiKey;
        if (string.IsNullOrWhiteSpace(key)) return false;
        try
        {
            using var req = new HttpRequestMessage(HttpMethod.Get,
                $"https://places.googleapis.com/v1/places/{r.PlaceId}");
            req.Headers.Add("X-Goog-Api-Key", key);
            req.Headers.Add("X-Goog-FieldMask", "photos");
            using var res = await http.SendAsync(req, ct);
            if (!res.IsSuccessStatusCode) return false;
            var json = await res.Content.ReadAsStringAsync(ct);
            using var doc = JsonDocument.Parse(json);
            var photos = ParsePhotos(doc.RootElement);
            if (photos.Count == 0) return false;
            r.Photos = photos;
            await db.SaveChangesAsync(ct);
            return true;
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Refresh de fotos falhou p/ {Id}", restaurantId);
            return false;
        }
    }

    private static List<string> MapCuisines(List<string> types, string query)
    {
        var out_ = types
            .Where(t => TypeToCuisine.ContainsKey(t))
            .Select(t => TypeToCuisine[t])
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();
        if (out_.Count == 0)
        {
            var q = query.ToLowerInvariant();
            var known = new[] { "japonesa", "lanches", "mexicana", "italiana", "brasileira", "pizza", "doces", "vegetariana", "chinesa", "árabe", "saudável", "cafés" };
            out_.AddRange(known.Where(k => q.Contains(k)));
        }
        return out_;
    }

    private static int? MapPrice(string? s) => s switch
    {
        "PRICE_LEVEL_FREE" => 0,
        "PRICE_LEVEL_INEXPENSIVE" => 1,
        "PRICE_LEVEL_MODERATE" => 2,
        "PRICE_LEVEL_EXPENSIVE" => 3,
        "PRICE_LEVEL_VERY_EXPENSIVE" => 4,
        _ => null,
    };

    private async Task UpsertAsync(List<Restaurant> places, CancellationToken ct)
    {
        var ids = places.Select(p => p.PlaceId).ToList();
        var existing = await db.Restaurants.Where(r => ids.Contains(r.PlaceId))
            .ToDictionaryAsync(r => r.PlaceId, ct);
        foreach (var p in places)
        {
            if (existing.TryGetValue(p.PlaceId, out var e))
            {
                e.Name = p.Name; e.Address = p.Address; e.Lat = p.Lat; e.Lng = p.Lng;
                e.Rating = p.Rating; e.PriceLevel = p.PriceLevel;
                if (p.Photos.Count > 0) e.Photos = p.Photos;
                e.Cuisines = p.Cuisines; e.CachedAt = DateTime.UtcNow;
            }
            else db.Restaurants.Add(p);
        }
        await db.SaveChangesAsync(ct);
    }
}
