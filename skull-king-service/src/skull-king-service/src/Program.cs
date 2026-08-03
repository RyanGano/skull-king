using Microsoft.EntityFrameworkCore;

var AllowSkullKingApp = "_allowSkullKingApp";

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContext<SkullKingDbContext>(options =>
  options.UseInMemoryDatabase("SkullKingInMemoryDb"));

SetupCors(AllowSkullKingApp, builder);

var app = builder.Build();
app.UseCors(AllowSkullKingApp);

GameRoutes.Register(app, AllowSkullKingApp);

app.MapMethods("/", ["GET", "HEAD"], () => "Skull King Api")
    .RequireCors(AllowSkullKingApp);

app.Run();

static void SetupCors(string AllowSkullKingApp, WebApplicationBuilder builder)
{
  builder.Services.AddCors(options =>
  {
    options.AddPolicy(name: AllowSkullKingApp,
          policy =>
          {
            var clientAddress = Environment.GetEnvironmentVariable("SK_CLIENT_ADDRESS") ?? "http://localhost";
            var port = Environment.GetEnvironmentVariable("PORT") ?? "53647";
            var origin = $"{clientAddress}:{port}";
            var allowed = new[] { origin, $"http://localhost:{port}", $"http://127.0.0.1:{port}" };
            policy.WithOrigins(allowed)
              .AllowAnyMethod()
              .AllowAnyHeader();
          });
  });
}

public partial class Program { }