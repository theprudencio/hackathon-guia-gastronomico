namespace GuiaGastronomico.Api.Domain;

public class Review
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public Guid RestaurantId { get; set; }
    public int Stars { get; set; }
    public string? Comment { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public User? User { get; set; }
    public Restaurant? Restaurant { get; set; }
}

// Cache semanal das descobertas por usuário.
public class DiscoveryCache
{
    public Guid UserId { get; set; }
    public string RestaurantIdsJson { get; set; } = "[]";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
