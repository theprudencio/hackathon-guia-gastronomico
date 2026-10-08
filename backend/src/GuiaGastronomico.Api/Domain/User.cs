namespace GuiaGastronomico.Api.Domain;

public static class Roles
{
    public const string User = "User";
    public const string Advertiser = "Advertiser";

    public static bool IsValid(string? role) =>
        role == User || role == Advertiser;
}

public class User
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string Role { get; set; } = Roles.User;
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public string? LocationLabel { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<UserCuisine> Cuisines { get; set; } = new List<UserCuisine>();
}

public class UserCuisine
{
    public Guid UserId { get; set; }
    public string Cuisine { get; set; } = string.Empty;
    public User? User { get; set; }
}
