using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using GuiaGastronomico.Api.Data;
using GuiaGastronomico.Api.Domain;
using GuiaGastronomico.Api.Dtos;
using GuiaGastronomico.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GuiaGastronomico.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(AppDbContext db, TokenService tokens) : ControllerBase
{
    [HttpPost("register")]
    public async Task<ActionResult<AuthResponse>> Register([FromBody] RegisterRequest req)
    {
        if (!ModelState.IsValid) return ValidationProblem(ModelState);

        var email = req.Email.Trim().ToLowerInvariant();
        if (await db.Users.AnyAsync(u => u.Email == email))
            return Conflict(new { message = "E-mail já cadastrado." });

        var role = string.IsNullOrWhiteSpace(req.Role) ? Roles.User : req.Role.Trim();
        if (!Roles.IsValid(role))
            return BadRequest(new { message = "Role inválida. Use User ou Advertiser." });

        var user = new User
        {
            Name = req.Name.Trim(),
            Email = email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.Password),
            Role = role,
        };
        db.Users.Add(user);
        await db.SaveChangesAsync();

        return Ok(ToAuthResponse(user, []));
    }

    [HttpPost("login")]
    public async Task<ActionResult<AuthResponse>> Login([FromBody] LoginRequest req)
    {
        if (!ModelState.IsValid) return ValidationProblem(ModelState);

        var email = req.Email.Trim().ToLowerInvariant();
        var user = await db.Users.Include(u => u.Cuisines)
            .FirstOrDefaultAsync(u => u.Email == email);
        if (user is null || !BCrypt.Net.BCrypt.Verify(req.Password, user.PasswordHash))
            return Unauthorized(new { message = "Credenciais inválidas." });

        var cuisines = user.Cuisines.Select(c => c.Cuisine).ToList();
        return Ok(ToAuthResponse(user, cuisines));
    }

    private AuthResponse ToAuthResponse(User user, List<string> cuisines) =>
        new(tokens.Generate(user), new UserDto(
            user.Id, user.Name, user.Email, user.Role,
            user.Latitude, user.Longitude, user.LocationLabel, cuisines));

    public static string? UserId(ClaimsPrincipal p) =>
        p.FindFirstValue(ClaimTypes.NameIdentifier) ?? p.FindFirstValue(JwtRegisteredClaimNames.Sub);
}
