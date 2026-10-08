using GuiaGastronomico.Api.Data;
using GuiaGastronomico.Api.Domain;
using GuiaGastronomico.Api.Options;
using GuiaGastronomico.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;

namespace GuiaGastronomico.Api.Controllers;

// Proxy: a chave do Google NUNCA vai p/ o front. <img> não envia JWT -> AllowAnonymous.
[ApiController]
[Route("api/restaurants/{restaurantId:guid}/photos")]
public class RestaurantPhotosController(
    AppDbContext db,
    IPlacesService places,
    IHttpClientFactory httpFactory,
    IMemoryCache cache,
    IOptions<GoogleOptions> google,
    ILogger<RestaurantPhotosController> logger) : ControllerBase
{
    [HttpGet("{index:int}")]
    [AllowAnonymous]
    public async Task<IActionResult> Get(Guid restaurantId, int index,
        [FromQuery] int w = 600, CancellationToken ct = default)
    {
        if (index is < 0 or > 2) return NotFound();
        w = Math.Clamp(w, 200, 1000);

        var r = await db.Restaurants.AsNoTracking().FirstOrDefaultAsync(x => x.Id == restaurantId, ct);
        if (r is null) return NotFound();

        var photo = r.Photos.Count > index ? r.Photos[index] : null;
        if (photo is null || string.IsNullOrEmpty(photo.Name))
            return Redirect(SeedImageFor(r)); // 302 p/ imagem estática local

        var cacheKey = $"photo:{restaurantId}:{index}:{w}";
        if (!cache.TryGetValue<PhotoCacheEntry>(cacheKey, out var img) || img is null)
        {
            var fetched = await FetchFromGoogleAsync(photo.Name, w, ct);
            if (fetched is null && await places.RefreshPhotosAsync(restaurantId, ct))
            {
                r = await db.Restaurants.AsNoTracking().FirstOrDefaultAsync(x => x.Id == restaurantId, ct);
                photo = r is not null && r.Photos.Count > index ? r.Photos[index] : null;
                if (photo is not null && !string.IsNullOrEmpty(photo.Name))
                    fetched = await FetchFromGoogleAsync(photo.Name, w, ct);
            }
            if (fetched is null) return NotFound();
            img = new PhotoCacheEntry(fetched.Value.bytes, fetched.Value.contentType);
            cache.Set(cacheKey, img, TimeSpan.FromHours(4));
        }

        Response.Headers.CacheControl = "public, max-age=86400";
        return File(img.Bytes, img.ContentType);
    }

    private async Task<(byte[] bytes, string contentType)?> FetchFromGoogleAsync(
        string photoName, int w, CancellationToken ct)
    {
        var key = google.Value.ApiKey;
        if (string.IsNullOrWhiteSpace(key)) return null;
        try
        {
            // HttpClient segue o 302 do Google e entrega os bytes finais.
            using var res = await httpFactory.CreateClient().GetAsync(
                $"https://places.googleapis.com/v1/{photoName}/media?maxWidthPx={w}&key={key}",
                HttpCompletionOption.ResponseHeadersRead, ct);
            if (res.StatusCode is System.Net.HttpStatusCode.BadRequest or System.Net.HttpStatusCode.NotFound)
                return null; // referência expirada -> chamador tenta refresh
            if (!res.IsSuccessStatusCode) return null;
            var bytes = await res.Content.ReadAsByteArrayAsync(ct);
            var ct_ = res.Content.Headers.ContentType?.MediaType ?? "image/jpeg";
            return (bytes, ct_);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Falha ao buscar mídia {Photo}", photoName);
            return null;
        }
    }

    private static string SeedImageFor(Restaurant r)
    {
        var cuisines = string.Join(" ", r.Cuisines).ToLowerInvariant();
        string file = cuisines.Contains("japonesa") || cuisines.Contains("chinesa") ? "sushi.svg"
            : cuisines.Contains("pizza") || cuisines.Contains("italiana") ? "pizza.svg"
            : cuisines.Contains("doces") || cuisines.Contains("caf") ? "dessert.svg"
            : "default.svg";
        return $"/seed-photos/{file}";
    }
}

file sealed record PhotoCacheEntry(byte[] Bytes, string ContentType);
