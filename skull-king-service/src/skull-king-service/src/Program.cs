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
            policy.WithOrigins($"http://localhost:{Environment.GetEnvironmentVariable("PORT")}").AllowAnyMethod().AllowAnyHeader();
          });
    // options.AddPolicy(name: AllowSkullKingApp,
    //       policy =>
    //       {
    //         policy.WithOrigins("https://green-stone-0b7a4a71e.3.azurestaticapps.net").AllowAnyMethod().AllowAnyHeader();
    //       });
  });
}

public partial class Program { }