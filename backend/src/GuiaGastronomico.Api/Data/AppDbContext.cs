using GuiaGastronomico.Api.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;

namespace GuiaGastronomico.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<UserCuisine> UserCuisines => Set<UserCuisine>();
    public DbSet<Restaurant> Restaurants => Set<Restaurant>();
    public DbSet<Review> Reviews => Set<Review>();
    public DbSet<DiscoveryCache> DiscoveryCaches => Set<DiscoveryCache>();
    public DbSet<Promotion> Promotions => Set<Promotion>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<User>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasIndex(x => x.Email).IsUnique();
            e.Property(x => x.Name).HasMaxLength(120).IsRequired();
            e.Property(x => x.Email).HasMaxLength(200).IsRequired();
            e.Property(x => x.PasswordHash).IsRequired();
            e.Property(x => x.Role).HasMaxLength(30).IsRequired();
            e.Property(x => x.LocationLabel).HasMaxLength(300);
        });

        modelBuilder.Entity<UserCuisine>(e =>
        {
            e.HasKey(x => new { x.UserId, x.Cuisine });
            e.Property(x => x.Cuisine).HasMaxLength(60).IsRequired();
            e.HasOne(x => x.User)
                .WithMany(u => u.Cuisines)
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Restaurant>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasIndex(x => x.PlaceId).IsUnique();
            e.Property(x => x.PlaceId).HasMaxLength(200).IsRequired();
            e.Property(x => x.Name).HasMaxLength(200).IsRequired();
            e.Property(x => x.Address).HasMaxLength(500).IsRequired();
            e.OwnsMany(x => x.Photos, b => b.ToJson());
            // Texto ";"-separado: funciona no Postgres e no Sqlite (testes).
            var cuisinesComparer = new ValueComparer<List<string>>(
                (a, b) => (a ?? new List<string>()).SequenceEqual(b ?? new List<string>()),
                v => v.Aggregate(0, (h, s) => HashCode.Combine(h, s.GetHashCode())),
                v => v.ToList());
            e.Property(x => x.Cuisines).HasConversion(
                v => string.Join(";", v),
                v => v.Split(";", StringSplitOptions.RemoveEmptyEntries).ToList(),
                cuisinesComparer);
        });

        modelBuilder.Entity<Review>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasIndex(x => new { x.UserId, x.RestaurantId }).IsUnique();
            e.Property(x => x.Stars).IsRequired();
            e.Property(x => x.Comment).HasMaxLength(280);
            e.HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Restaurant).WithMany().HasForeignKey(x => x.RestaurantId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<DiscoveryCache>(e =>
        {
            e.HasKey(x => x.UserId);
        });

        modelBuilder.Entity<Promotion>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Title).HasMaxLength(120).IsRequired();
            e.Property(x => x.Description).HasMaxLength(500);
            e.Property(x => x.Plan).HasMaxLength(30).IsRequired();
            e.Property(x => x.Status).HasMaxLength(30).IsRequired();
            e.HasOne(x => x.Restaurant).WithMany().HasForeignKey(x => x.RestaurantId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Advertiser).WithMany().HasForeignKey(x => x.AdvertiserId).OnDelete(DeleteBehavior.Cascade);
        });
    }
}
