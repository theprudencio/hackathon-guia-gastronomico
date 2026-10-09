using System.Globalization;
using System.Text.Json;
using GuiaGastronomico.Api.Options;
using Microsoft.Extensions.Options;

namespace GuiaGastronomico.Api.Services;

/// <summary>Coordenadas -> "Cidade, UF". Google Geocoding primeiro, Nominatim (OSM) de fallback.</summary>
public class GeocodeService : IGeocodeService
{
    private readonly HttpClient _http;
    private readonly IOptions<GoogleOptions> _options;
    private readonly ILogger<GeocodeService> _logger;

    public GeocodeService(HttpClient http, IOptions<GoogleOptions> options, ILogger<GeocodeService> logger)
    {
        _http = http;
        _options = options;
        _logger = logger;
        _http.DefaultRequestHeaders.UserAgent.ParseAdd("guia-gastronomico/1.0 (hackathon)");
    }

    public async Task<string?> ReverseAsync(double lat, double lng, CancellationToken ct = default)
    {
        var fromGoogle = await FromGoogleAsync(lat, lng, ct);
        if (fromGoogle is not null) return fromGoogle;
        return await FromNominatimAsync(lat, lng, ct);
    }

    private async Task<string?> FromGoogleAsync(double lat, double lng, CancellationToken ct)
    {
        var key = _options.Value.ApiKey;
        if (string.IsNullOrWhiteSpace(key)) return null;
        try
        {
            var ll = $"{lat.ToString(CultureInfo.InvariantCulture)},{lng.ToString(CultureInfo.InvariantCulture)}";
            var url = $"https://maps.googleapis.com/maps/api/geocode/json?latlng={ll}&key={key}&language=pt-BR";
            using var res = await _http.GetAsync(url, ct);
            if (!res.IsSuccessStatusCode) return null;
            using var doc = JsonDocument.Parse(await res.Content.ReadAsStringAsync(ct));
            var root = doc.RootElement;
            if (root.TryGetProperty("status", out var st) && st.GetString() != "OK") return null;
            if (!root.TryGetProperty("results", out var results) || results.GetArrayLength() == 0) return null;

            string? city = null, uf = null;
            foreach (var r in results.EnumerateArray())
            {
                if (!r.TryGetProperty("address_components", out var comps)) continue;
                foreach (var c in comps.EnumerateArray())
                {
                    var types = c.TryGetProperty("types", out var t)
                        ? t.EnumerateArray().Select(x => x.GetString()).ToHashSet() : new HashSet<string?>();
                    if (city is null && (types.Contains("locality") || types.Contains("administrative_area_level_2")))
                        city = c.TryGetProperty("long_name", out var ln) ? ln.GetString() : null;
                    if (uf is null && types.Contains("administrative_area_level_1"))
                        uf = c.TryGetProperty("short_name", out var sn) ? sn.GetString() : null;
                }
                if (city is not null && uf is not null) break;
            }
            return Join(city, uf);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Reverse geocode (Google) falhou.");
            return null;
        }
    }

    private async Task<string?> FromNominatimAsync(double lat, double lng, CancellationToken ct)
    {
        try
        {
            var url = $"https://nominatim.openstreetmap.org/reverse?format=json&lat={lat.ToString(CultureInfo.InvariantCulture)}&lon={lng.ToString(CultureInfo.InvariantCulture)}&zoom=10&addressdetails=1";
            using var res = await _http.GetAsync(url, ct);
            if (!res.IsSuccessStatusCode) return null;
            using var doc = JsonDocument.Parse(await res.Content.ReadAsStringAsync(ct));
            if (!doc.RootElement.TryGetProperty("address", out var a)) return null;

            string? city = Str(a, "city") ?? Str(a, "town") ?? Str(a, "village")
                ?? Str(a, "municipality") ?? Str(a, "county");
            // "BR-SP" -> "SP"
            var iso = Str(a, "ISO3166-2-lvl4");
            string? uf = iso?.Contains('-') == true ? iso.Split('-').Last() : null;
            return Join(city, uf ?? Str(a, "state"));
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Reverse geocode (Nominatim) falhou.");
            return null;
        }
    }

    private static string? Str(JsonElement el, string prop) =>
        el.TryGetProperty(prop, out var v) ? v.GetString() : null;

    private static string? Join(string? city, string? uf)
    {
        city = city?.Trim();
        uf = uf?.Trim();
        if (string.IsNullOrEmpty(city) && string.IsNullOrEmpty(uf)) return null;
        if (string.IsNullOrEmpty(uf)) return city;
        if (string.IsNullOrEmpty(city)) return uf;
        return $"{city}, {uf}";
    }
}
