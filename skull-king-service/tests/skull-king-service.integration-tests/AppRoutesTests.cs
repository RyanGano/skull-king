using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;

namespace skull_king_service.integration_tests;

public class AppRoutesTests : IClassFixture<TestFixture>
{
  private readonly HttpClient _client;

  public AppRoutesTests(TestFixture fixture)
  {
    _client = fixture.Client;
  }

  [Fact]
  public async Task WarmUpTest()
  {
    var response = await _client.GetAsync("/");

    response.EnsureSuccessStatusCode();
    Assert.Equal(HttpStatusCode.OK, response.StatusCode);
  }
}