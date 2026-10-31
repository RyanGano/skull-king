using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc.Testing;

namespace skull_king_service.integration_tests;

public class RateLimitTests
{
  private static HttpClient CreateClient(string setting, int perMinute)
  {
    var appFactory = new WebApplicationFactory<Program>()
      .WithWebHostBuilder(builder => builder.UseSetting($"RateLimits:{setting}", perMinute.ToString()));

    return appFactory.CreateClient();
  }

  private static HttpRequestMessage CreateGameRequest(string forwardedFor)
  {
    var request = new HttpRequestMessage(HttpMethod.Post, "/games")
    {
      Content = JsonContent.Create(new NewGameDto { PlayerName = "Captain" }),
    };
    request.Headers.Add("X-Forwarded-For", forwardedFor);
    return request;
  }

  [Fact]
  public async Task CreatingGamesIsLimitedPerClient()
  {
    var client = CreateClient("GameCreatePerMinute", 2);

    Assert.Equal(HttpStatusCode.Created, (await client.SendAsync(CreateGameRequest("203.0.113.10:50001"))).StatusCode);
    Assert.Equal(HttpStatusCode.Created, (await client.SendAsync(CreateGameRequest("203.0.113.10:50002"))).StatusCode);
    Assert.Equal(HttpStatusCode.TooManyRequests, (await client.SendAsync(CreateGameRequest("203.0.113.10:50003"))).StatusCode);

    // A different client is unaffected
    Assert.Equal(HttpStatusCode.Created, (await client.SendAsync(CreateGameRequest("203.0.113.11:50001"))).StatusCode);
  }

  [Fact]
  public async Task ClientSuppliedForwardedForEntriesDoNotChangeThePartition()
  {
    var client = CreateClient("GameCreatePerMinute", 1);

    // Only the last entry (the one the platform appends) identifies the caller
    Assert.Equal(HttpStatusCode.Created, (await client.SendAsync(CreateGameRequest("198.51.100.1, 203.0.113.20:50001"))).StatusCode);
    Assert.Equal(HttpStatusCode.TooManyRequests, (await client.SendAsync(CreateGameRequest("198.51.100.2, 203.0.113.20:50002"))).StatusCode);
  }

  [Fact]
  public async Task ReadingGamesIsLimitedPerClient()
  {
    var client = CreateClient("GameReadPerMinute", 3);

    for (var i = 0; i < 3; i++)
    {
      var request = new HttpRequestMessage(HttpMethod.Get, "/games/0000");
      request.Headers.Add("X-Forwarded-For", "203.0.113.30:50001");
      Assert.Equal(HttpStatusCode.NotFound, (await client.SendAsync(request)).StatusCode);
    }

    var limited = new HttpRequestMessage(HttpMethod.Get, "/games/0000");
    limited.Headers.Add("X-Forwarded-For", "203.0.113.30:50001");
    Assert.Equal(HttpStatusCode.TooManyRequests, (await client.SendAsync(limited)).StatusCode);
  }
}
