using System.Security.Claims;
using GuiaGastronomico.Api.Data;
using GuiaGastronomico.Api.Dtos;
using GuiaGastronomico.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GuiaGastronomico.Api.Controllers;

[ApiController]
[Route("api/restaurants/{id:guid}/reviews")]
[Authorize]
public class ReviewsController(AppDbContext db, ReviewService reviews) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<List<ReviewDto>>> List(Guid id, CancellationToken ct)
    {
        if (!await db.Restaurants.AnyAsync(r => r.Id == id, ct))
            return NotFound(new { message = "Restaurante não encontrado." });

        var items = await db.Reviews.Include(r => r.User)
            .Where(r => r.RestaurantId == id)
            .OrderByDescending(r => r.CreatedAt)
            .Take(50)
            .Select(r => new ReviewDto(r.Id, r.User!.Name, r.Stars, r.Comment, r.CreatedAt))
            .ToListAsync(ct);
        return Ok(items);
    }

    [HttpPost]
    public async Task<ActionResult<ReviewDto>> Upsert(Guid id, [FromBody] CreateReviewRequest req, CancellationToken ct)
    {
        if (!ModelState.IsValid) return ValidationProblem(ModelState);
        if (!await db.Restaurants.AnyAsync(r => r.Id == id, ct))
            return NotFound(new { message = "Restaurante não encontrado." });
        if (!Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var userId))
            return Unauthorized();

        var saved = await reviews.UpsertAsync(userId, id, req.Stars, req.Comment, ct);
        var user = await db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId, ct);
        return Ok(new ReviewDto(saved.Id, user?.Name ?? "Você", saved.Stars, saved.Comment, saved.CreatedAt));
    }
}
