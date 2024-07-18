using Microsoft.EntityFrameworkCore;

var AllowSkullKingApp = "_allowSkullKingApp";

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContext<SkullKingDbContext>(options =>
    options.UseInMemoryDatabase("SkullKingInMemoryDb"));

SetupCors(AllowSkullKingApp, builder);

var app = builder.Build();
app.UseCors();

GameRoutes.Register(app, AllowSkullKingApp);

app.MapGet("/", () => "Skull King Api");

app.Run();

static void SetupCors(string AllowSkullKingApp, WebApplicationBuilder builder)
{
  builder.Services.AddCors(options =>
  {
    options.AddPolicy(name: AllowSkullKingApp,
          policy =>
          {
            policy.WithOrigins($"{Environment.GetEnvironmentVariable("SK_CLIENT_ADDRESS")}:{Environment.GetEnvironmentVariable("PORT")}").AllowAnyMethod().AllowAnyHeader();
          });
  });
}

public partial class Program { }