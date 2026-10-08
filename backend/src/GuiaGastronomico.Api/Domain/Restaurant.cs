namespace GuiaGastronomico.Api.Domain;

public class RestaurantPhoto
{
    public string Name { get; set; } = string.Empty;
    public string? AuthorName { get; set; }
    public string? AuthorUri { get; set; }
}

public class Restaurant
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string PlaceId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;
    public double Lat { get; set; }
    public double Lng { get; set; }
    public double? Rating { get; set; }
    public int? PriceLevel { get; set; }
    public List<RestaurantPhoto> Photos { get; set; } = new();
    public List<string> Cuisines { get; set; } = new();
    public DateTime CachedAt { get; set; } = DateTime.UtcNow;
}
