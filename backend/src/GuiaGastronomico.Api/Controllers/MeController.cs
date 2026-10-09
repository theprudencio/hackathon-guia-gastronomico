using System.Security.Claims;
using GuiaGastronomico.Api.Data;
using GuiaGastronomico.Api.Domain;
using GuiaGastronomico.Api.Dtos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GuiaGastronomico.Api.Controllers;

[ApiController]
[Route("api/me")]
[Authorize]
public class MeController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<UserDto>> GetMe()
    {
        var user = await FindMeAsync();
        if (user is null) return Unauthorized();
        return Ok(ToDto(user));
    }

    [HttpPut("preferences")]
    public async Task<ActionResult<UserDto>> UpdatePreferences([FromBody] UpdatePreferencesRequest req)
    {
        if (!ModelState.IsValid) return ValidationProblem(ModelState);

        var user = await db.Users.Include(u => u.Cuisines)
            .FirstOrDefaultAsync(u => u.Id == CurrentUserId());
        if (user is null) return Unauthorized();

        var cuisines = (req.Cuisines ?? [])
            .Select(c => c.Trim().ToLowerInvariant())
            .Where(c => c.Length is >= 2 and <= 60)
            .Distinct()
            .Take(10)
            .ToList();
        if (cuisines.Count == 0)
            return BadRequest(new { message = "Escolha pelo menos um gosto culinário." });

        user.Latitude = req.Latitude;
        user.Longitude = req.Longitude;
        user.LocationLabel = string.IsNullOrWhiteSpace(req.LocationLabel) ? null : req.LocationLabel.Trim();

        // Coordenadas sem nome legível não valem: a UI nunca exibe lat/lng.
        if ((user.Latitude.HasValue || user.Longitude.HasValue) && user.LocationLabel is null)
            return BadRequest(new { message = "Informe o nome da sua cidade ou bairro." });

        db.UserCuisines.RemoveRange(user.Cuisines);
        user.Cuisines = cuisines.Select(c => new UserCuisine { UserId = user.Id, Cuisine = c }).ToList();

        await db.SaveChangesAsync();
        return Ok(ToDto(user));
    }

    private Guid? CurrentUserId() =>
        Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : null;

    private Task<User?> FindMeAsync()
    {
        var id = CurrentUserId();
        if (id is null) return Task.FromResult<User?>(null);
        return db.Users.Include(u => u.Cuisines).FirstOrDefaultAsync(u => u.Id == id);
    }

    private static UserDto ToDto(User user) => new(
        user.Id, user.Name, user.Email, user.Role,
        user.Latitude, user.Longitude, user.LocationLabel,
        user.Cuisines.Select(c => c.Cuisine).ToList());
}
