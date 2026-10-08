namespace GuiaGastronomico.Api.Domain;

public static class PromotionPlans
{
    public const string Weekly = "weekly";
    public const string Monthly = "monthly";

    public static int Days(string? plan) => plan == Monthly ? 30 : 7;
    public static string Label(string? plan) => plan == Monthly ? "Destaque mensal" : "Destaque semanal";
}

public class Promotion
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid RestaurantId { get; set; }
    public Guid AdvertiserId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public DateTime StartsAt { get; set; } = DateTime.UtcNow;
    public DateTime EndsAt { get; set; } = DateTime.UtcNow.AddDays(7);
    public string Plan { get; set; } = PromotionPlans.Weekly;
    public string Status { get; set; } = "Paid";

    public Restaurant? Restaurant { get; set; }
    public User? Advertiser { get; set; }
}

public static class PromotionQueries
{
    public static IQueryable<Promotion> Active(this IQueryable<Promotion> q, DateTime now) =>
        q.Where(p => p.StartsAt <= now && now <= p.EndsAt && p.Status == "Paid");
}
