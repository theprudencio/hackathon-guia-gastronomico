using System.ComponentModel.DataAnnotations;
using GuiaGastronomico.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GuiaGastronomico.Api.Controllers;

[ApiController]
[Route("api/geocode")]
[Authorize]
public class GeocodeController(IGeocodeService geocode) : ControllerBase
{
    [HttpGet("reverse")]
    public async Task<ActionResult<object>> Reverse(
        [FromQuery, Range(-90, 90)] double lat,
        [FromQuery, Range(-180, 180)] double lng,
        CancellationToken ct)
    {
        var label = await geocode.ReverseAsync(lat, lng, ct);
        if (label is null)
            return NotFound(new { message = "Não encontrei a cidade para essas coordenadas. Digite manualmente." });
        return Ok(new { label });
    }
}
