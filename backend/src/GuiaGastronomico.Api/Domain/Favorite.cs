namespace GuiaGastronomico.Api.Domain;

public class Favorite
{
    public Guid UserId { get; set; }
    public Guid RestaurantId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public User? User { get; set; }
    public Restaurant? Restaurant { get; set; }
}
