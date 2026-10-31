using Microsoft.AspNetCore.RateLimiting;
using System.Threading.RateLimiting;

public static class RateLimits
{
  public const string GameRead = "game-read";
  public const string GameCreate = "game-create";
  public const string GameJoin = "game-join";

  // Per client IP, per minute. Several players at one table usually share one
  // network address and each polls the game once a second, so the read limit
  // has to cover a full table of 9 at once. Overridable via configuration
  // (RateLimits:GameReadPerMinute etc.).
  public const int DefaultGameReadPerMinute = 900;
  public const int DefaultGameCreatePerMinute = 10;
  public const int DefaultGameJoinPerMinute = 30;

  public static void AddGameRateLimits(this IServiceCollection services)
  {
    services.AddRateLimiter(options =>
    {
      options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
      options.AddPolicy(GameRead, httpContext => PerClient(httpContext, "GameReadPerMinute", DefaultGameReadPerMinute));
      options.AddPolicy(GameCreate, httpContext => PerClient(httpContext, "GameCreatePerMinute", DefaultGameCreatePerMinute));
      options.AddPolicy(GameJoin, httpContext => PerClient(httpContext, "GameJoinPerMinute", DefaultGameJoinPerMinute));
    });
  }

  private static RateLimitPartition<string> PerClient(HttpContext httpContext, string setting, int defaultLimit)
  {
    var configuration = httpContext.RequestServices.GetRequiredService<IConfiguration>();
    var permitLimit = configuration.GetValue($"RateLimits:{setting}", defaultLimit);

    return RateLimitPartition.GetFixedWindowLimiter(
      ClientIp.Get(httpContext),
      _ => new FixedWindowRateLimiterOptions
      {
        PermitLimit = permitLimit,
        Window = TimeSpan.FromMinutes(1),
        QueueLimit = 0,
      });
  }
}
