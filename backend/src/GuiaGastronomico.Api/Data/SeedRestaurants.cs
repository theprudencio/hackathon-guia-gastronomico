using GuiaGastronomico.Api.Domain;

namespace GuiaGastronomico.Api.Data;

// Fallback quando a Google Places API falha ou não há chave.
// Coordenadas aproximadas: região Av. Paulista, São Paulo.
public static class SeedRestaurants
{
    public static readonly List<Restaurant> All = new()
    {
        New("seed-tanaka", "Tanaka Sushi", "Rua Vergueiro, 1000 - Liberdade", -23.5560, -46.6320, 4.7, 2, new() { "japonesa" }),
        New("seed-temaki", "Temaki House", "Av. Paulista, 1500 - Bela Vista", -23.5614, -46.6550, 4.4, 1, new() { "japonesa" }),
        New("seed-burger", "Burger da Vila", "Rua Augusta, 2000 - Consolação", -23.5558, -46.6630, 4.5, 1, new() { "lanches" }),
        New("seed-taco", "Taco Loco", "Rua Oscar Freire, 500 - Jardins", -23.5610, -46.6690, 4.3, 1, new() { "mexicana" }),
        New("seed-trattoria", "Trattoria Bella", "Rua Haddock Lobo, 800 - Cerqueira César", -23.5630, -46.6660, 4.8, 3, new() { "italiana" }),
        New("seed-forno", "Forno a Lenha", "Av. Faria Lima, 3000 - Itaim Bibi", -23.5860, -46.6840, 4.6, 2, new() { "pizza", "italiana" }),
        New("seed-feijoada", "Casa da Feijoada", "Rua Santa Ifigênia, 300 - Centro", -23.5440, -46.6360, 4.6, 2, new() { "brasileira" }),
        New("seed-acaraje", "Acarajé da Bahia", "Largo da Batata, 100 - Pinheiros", -23.5620, -46.6850, 4.2, 1, new() { "brasileira" }),
        New("seed-doceria", "Doceria Céu", "Rua Fradique Coutinho, 900 - Pinheiros", -23.5615, -46.6845, 4.9, 2, new() { "doces" }),
        New("seed-veg", "Verde Vivo", "Rua Harmonia, 400 - Vila Madalena", -23.5565, -46.6860, 4.5, 2, new() { "vegetariana", "saudável" }),
        New("seed-dragon", "Dragão Chinês", "Rua da Glória, 200 - Liberdade", -23.5570, -46.6330, 4.1, 1, new() { "chinesa" }),
        New("seed-beirute", "Beirute Express", "Av. Paulista, 800 - Bela Vista", -23.5635, -46.6500, 4.0, 1, new() { "árabe" }),
        New("seed-padaria", "Padaria Pão Quente", "Rua Vergueiro, 2000 - Vila Mariana", -23.5710, -46.6325, 4.4, 1, new() { "cafés", "lanches" }),
        New("seed-churras", "Churrasco do Sul", "Av. Santo Amaro, 5000 - Brooklin", -23.6040, -46.6850, 4.3, 2, new() { "brasileira" }),
        New("seed-saudavel", "Bowl & Cia", "Rua Pinheiros, 700 - Pinheiros", -23.5630, -46.6820, 4.6, 2, new() { "saudável", "vegetariana" }),
    };

    private static Restaurant New(string placeId, string name, string address,
        double lat, double lng, double rating, int price, List<string> cuisines) =>
        new()
        {
            Id = Guid.NewGuid(),
            PlaceId = placeId,
            Name = name,
            Address = address,
            Lat = lat,
            Lng = lng,
            Rating = rating,
            PriceLevel = price,
            Cuisines = cuisines,
            CachedAt = DateTime.UtcNow,
        };

    public static List<Restaurant> Filter(string query, double? lat, double? lng, int max)
    {
        var terms = Norm(query).Split([' ', ',', '+'], StringSplitOptions.RemoveEmptyEntries)
            .Where(t => t.Length >= 3).ToArray();
        var scored = All
            .Select(r => new
            {
                R = r,
                D = lat.HasValue && lng.HasValue
                    ? GeoKm(lat.Value, lng.Value, r.Lat, r.Lng) : (double?)null,
                Match = terms.Length == 0 || terms.Any(t =>
                    Norm(r.Name).Contains(t)
                    || Norm(r.Address).Contains(t)
                    || r.Cuisines.Any(c => Norm(c).Contains(t) || t.Contains(Norm(c)))),
            })
            .Where(x => x.Match)
            .Where(x => x.D is null || x.D <= 50)
            .OrderBy(x => x.D ?? 5)
            .ThenByDescending(x => x.R.Rating)
            .Take(max)
            .Select(x => x.R)
            .ToList();
        return scored.Count > 0 ? scored : All.OrderByDescending(r => r.Rating).Take(max).ToList();
    }

    public static double GeoKm(double lat1, double lon1, double lat2, double lon2)
    {
        const double R = 6371;
        var dLat = (lat2 - lat1) * Math.PI / 180;
        var dLon = (lon2 - lon1) * Math.PI / 180;
        var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2)
            + Math.Cos(lat1 * Math.PI / 180) * Math.Cos(lat2 * Math.PI / 180)
            * Math.Sin(dLon / 2) * Math.Sin(dLon / 2);
        return 2 * R * Math.Asin(Math.Sqrt(a));
    }

    // Minúsculas sem acento p/ matching tolerante ("japonês" casa com "japonesa").
    public static string Norm(string s)
    {
        var formD = (s ?? "").ToLowerInvariant().Normalize(System.Text.NormalizationForm.FormD);
        var sb = new System.Text.StringBuilder(formD.Length);
        foreach (var ch in formD)
        {
            var cat = System.Globalization.CharUnicodeInfo.GetUnicodeCategory(ch);
            if (cat != System.Globalization.UnicodeCategory.NonSpacingMark) sb.Append(ch);
        }
        return sb.ToString().Normalize(System.Text.NormalizationForm.FormC);
    }
}
