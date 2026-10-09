using System.Text;
using GuiaGastronomico.Api.Data;
using GuiaGastronomico.Api.Options;
using GuiaGastronomico.Api.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

var conn = Environment.GetEnvironmentVariable("DB_CONN")
    ?? builder.Configuration.GetConnectionString("Default")
    ?? builder.Configuration["DB_CONN"]
    ?? "Host=localhost;Port=5432;Database=guia;Username=guia;Password=guia";

var jwtSecret = Environment.GetEnvironmentVariable("JWT_SECRET")
    ?? builder.Configuration["Jwt:Secret"]
    ?? "dev-secret-troque-em-producao-com-32-chars-min";
builder.Configuration["Jwt:Secret"] = jwtSecret;

builder.Services.Configure<JwtOptions>(builder.Configuration.GetSection(JwtOptions.Section));
builder.Services.Configure<GoogleOptions>(o =>
{
    o.ApiKey = Environment.GetEnvironmentVariable("GOOGLE_PLACES_KEY")
        ?? builder.Configuration["Google:ApiKey"] ?? string.Empty;
    o.CacheHours = int.TryParse(builder.Configuration["Google:CacheHours"], out var h) ? h : 12;
});
builder.Services.Configure<LlmOptions>(o =>
{
    o.ApiKey = Environment.GetEnvironmentVariable("LLM_API_KEY")
        ?? builder.Configuration["Llm:ApiKey"] ?? string.Empty;
    o.Model = Environment.GetEnvironmentVariable("LLM_MODEL")
        ?? builder.Configuration["Llm:Model"] ?? "gpt-4o-mini";
    o.BaseUrl = Environment.GetEnvironmentVariable("LLM_BASE_URL")
        ?? builder.Configuration["Llm:BaseUrl"] ?? "https://api.openai.com/v1";
});
builder.Services.AddSingleton<GuiaGastronomico.Api.Services.TokenService>();
builder.Services.AddHttpClient<IPlacesService, PlacesService>();
builder.Services.AddHttpClient<ILlmService, LlmService>();
builder.Services.AddHttpClient<IGeocodeService, GeocodeService>();
builder.Services.AddHttpClient<IOpeningHoursService, OpeningHoursService>();
builder.Services.AddScoped<ChatOrchestrator>();
builder.Services.AddScoped<ReviewService>();
builder.Services.AddScoped<DiscoveryService>();
builder.Services.AddScoped<FavoriteService>();

// Demo local sem Docker: DB_PROVIDER=sqlite usa arquivo local. Padrão: Postgres.
var useSqlite = (Environment.GetEnvironmentVariable("DB_PROVIDER") ?? builder.Configuration["DbProvider"] ?? "")
    .Equals("sqlite", StringComparison.OrdinalIgnoreCase)
    || conn.StartsWith("DataSource=", StringComparison.OrdinalIgnoreCase);
if (useSqlite)
    builder.Services.AddDbContext<AppDbContext>(o => o.UseSqlite(conn));
else
    builder.Services.AddDbContext<AppDbContext>(o => o.UseNpgsql(conn));

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(o =>
    {
        o.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"] ?? "guia-gastronomico",
            ValidAudience = builder.Configuration["Jwt:Audience"] ?? "guia-gastronomico",
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
            ClockSkew = TimeSpan.FromMinutes(2),
        };
    });
builder.Services.AddAuthorization();

builder.Services.AddCors(o => o.AddPolicy("front", p =>
{
    // Só o front pode chamar a API. Lista via env (Render/Vercel) ou config:
    // CORS_ORIGINS=https://meu-app.vercel.app,https://www.meu-dominio.com
    var raw = Environment.GetEnvironmentVariable("CORS_ORIGINS")
        ?? builder.Configuration["Cors:AllowedOrigins"] ?? "";
    var origins = raw.Split([',', ';'], StringSplitOptions.RemoveEmptyEntries)
        .Select(s => s.Trim().TrimEnd('/'))
        .Where(s => s.Length > 0)
        .Distinct(StringComparer.OrdinalIgnoreCase)
        .ToArray();
    if (origins.Length == 0)
        origins = ["http://localhost:5173"]; // dev local
    p.WithOrigins(origins).AllowAnyHeader().AllowAnyMethod();
}));

builder.Services.AddControllers();
builder.Services.AddProblemDetails();
builder.Services.AddMemoryCache();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new() { Title = "Zup API", Version = "v1" });
    c.AddSecurityDefinition("Bearer", new Microsoft.OpenApi.Models.OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = Microsoft.OpenApi.Models.SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = Microsoft.OpenApi.Models.ParameterLocation.Header,
    });
    c.AddSecurityRequirement(new Microsoft.OpenApi.Models.OpenApiSecurityRequirement
    {
        {
            new Microsoft.OpenApi.Models.OpenApiSecurityScheme
            {
                Reference = new Microsoft.OpenApi.Models.OpenApiReference
                {
                    Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme, Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

var app = builder.Build();

app.UseExceptionHandler();
app.UseSwagger();
app.UseSwaggerUI();
app.UseStaticFiles();
app.UseCors("front");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapGet("/health", () => Results.Ok(new { ok = true }));

// Migrations no startup (simples, ideal p/ hackathon)
using (var scope = app.Services.CreateScope())
{
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
    try
    {
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        if (useSqlite)
            db.Database.EnsureCreated();
        else
            db.Database.Migrate();
        await SeedData.SeedAsync(db);
        logger.LogInformation("Banco pronto + seed ok (sqlite={Sqlite}).", useSqlite);
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "Falha ao aplicar migrations no startup.");
    }
}

app.Run();
