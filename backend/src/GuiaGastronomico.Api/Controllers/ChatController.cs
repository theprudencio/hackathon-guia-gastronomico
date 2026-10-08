using System.Security.Claims;
using GuiaGastronomico.Api.Dtos;
using GuiaGastronomico.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GuiaGastronomico.Api.Controllers;

[ApiController]
[Route("api/chat")]
[Authorize]
public class ChatController(ChatOrchestrator orchestrator) : ControllerBase
{
    [HttpPost]
    public async Task<ActionResult<ChatResponse>> Post([FromBody] ChatRequest req, CancellationToken ct)
    {
        if (!ModelState.IsValid) return ValidationProblem(ModelState);
        if (!Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var userId))
            return Unauthorized();
        return Ok(await orchestrator.HandleAsync(userId, req, ct));
    }
}
