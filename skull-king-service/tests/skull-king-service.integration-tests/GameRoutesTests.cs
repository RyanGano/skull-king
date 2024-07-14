using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;

namespace skull_king_service.integration_tests;

public class GameRoutesTests : IClassFixture<TestFixture>
{
  private readonly HttpClient _client;
  private readonly SkullKingDbContext _dbContext;
  private readonly JsonSerializerOptions _JsonSerializerOptions;

  public GameRoutesTests(TestFixture fixture)
  {
    _client = fixture.Client;
    _dbContext = fixture.DbContext;
    _JsonSerializerOptions = fixture.JsonSerializerOptions;
  }

  [Theory]
  [InlineData("__Sample Game 1__", true)]
  [InlineData("Ryan", false)]
  public async Task CreateGameWithTestUserHasTestId(string name, bool isTestGameId)
  {
    var newGameDto = new NewGameDto { PlayerName = name };
    var content = JsonContent.Create(newGameDto);

    var response = await _client.PostAsync("/games", content);

    response.EnsureSuccessStatusCode();
    Assert.Equal(HttpStatusCode.Created, response.StatusCode);

    var responseContent = await response.Content.ReadAsStringAsync();
    var responseGame = JsonSerializer.Deserialize<GameDto>(responseContent, _JsonSerializerOptions);
    var gameId = responseGame?.Id;

    Assert.NotNull(gameId);

    if (isTestGameId)
      Assert.Equal("ABCD", gameId);
    else
      Assert.NotEqual("ABCD", gameId);
  }

  [Fact]
  public async Task CreatedGameIsValid()
  {
    var newGameDto = new NewGameDto { PlayerName = "Test Player" };
    var content = JsonContent.Create(newGameDto);
    var response = await _client.PostAsync("/games", content);

    var responseContent = await response.Content.ReadAsStringAsync();
    var responseGame = JsonSerializer.Deserialize<GameDto>(responseContent, _JsonSerializerOptions);
    var gameId = responseGame?.Id;

    var game = await _dbContext.Games.Include(g => g.Players).FirstOrDefaultAsync(x => x.Id == gameId);

    Assert.NotNull(game);
    Assert.Equal("Test Player", game.Players.Single().Name);
    Assert.Equal(GameStatus.AcceptingPlayers, game.Status);
  }

  [Fact]
  public async Task CannotCreateGameWithSameId()
  {
    var newGameDto = new NewGameDto { PlayerName = "__Sample Game 1__" };
    var content = JsonContent.Create(newGameDto);
    var response = await _client.PostAsync("/games", content);

    response = await _client.PostAsync("/games", content);
    Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
  }

  [Fact]
  public async Task CanRetrieveGameWithValidId()
  {
    var newGameDto = new NewGameDto { PlayerName = "Tester" };
    var content = JsonContent.Create(newGameDto);
    var response = await _client.PostAsync("/games", content);

    var responseContent = await response.Content.ReadAsStringAsync();
    var responseGame = JsonSerializer.Deserialize<GameDto>(responseContent, _JsonSerializerOptions);
    var gameId = responseGame?.Id;

    response = await _client.GetAsync($"/games/{gameId}");

    response.EnsureSuccessStatusCode();
    Assert.Equal(HttpStatusCode.OK, response.StatusCode);

    responseContent = await response.Content.ReadAsStringAsync();
    responseGame = JsonSerializer.Deserialize<GameDto>(responseContent, _JsonSerializerOptions);
    var lookupGameId = responseGame?.Id;

    Assert.Equal(gameId, lookupGameId);
  }

  [Fact]
  public async Task RetrievingGameWithCurrentHashSavesBandwidth()
  {
    var newGameDto = new NewGameDto { PlayerName = "Tester" };
    var content = JsonContent.Create(newGameDto);
    var response = await _client.PostAsync("/games", content);

    var responseContent = await response.Content.ReadAsStringAsync();
    var responseGame = JsonSerializer.Deserialize<GameDto>(responseContent, _JsonSerializerOptions);
    var gameId = responseGame?.Id;
    var gameHash = responseGame?.Hash;

    response = await _client.GetAsync($"/games/{gameId}/?knownHash={gameHash}");
    Assert.Equal(HttpStatusCode.NotModified, response.StatusCode);

    response = await _client.GetAsync($"/games/{gameId}/?hash={responseContent.GetHashCode()}");
    Assert.Equal(HttpStatusCode.OK, response.StatusCode);

    responseContent = await response.Content.ReadAsStringAsync();
    var secondResponseGame = JsonSerializer.Deserialize<GameDto>(responseContent, _JsonSerializerOptions);
    var lookupGameId = secondResponseGame?.Id;

    Assert.Equal(gameId, lookupGameId);
    Assert.Equivalent(responseGame, secondResponseGame);
  }

  [Fact]
  public async Task CannotRetrieveInvalidGameId()
  {
    var response = await _client.GetAsync($"/games/INVALID");

    Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
  }

  [Fact]
  public async Task CanAddPlayerToExistingGame()
  {
    var newGameDto = new NewGameDto { PlayerName = "Tester" };
    var gameContent = JsonContent.Create(newGameDto);
    var response = await _client.PostAsync("/games", gameContent);

    var responseContent = await response.Content.ReadAsStringAsync();
    var responseGame = JsonSerializer.Deserialize<GameDto>(responseContent, _JsonSerializerOptions);
    var gameId = responseGame?.Id;

    var newPlayer = new PlayerDto { Name = "Player 2" };
    var playerContent = JsonContent.Create(newPlayer);
    response = await _client.PutAsync($"/games/{gameId}/players", playerContent);

    response.EnsureSuccessStatusCode();
    Assert.Equal(HttpStatusCode.OK, response.StatusCode);

    responseContent = await response.Content.ReadAsStringAsync();
    var responsePlayer = JsonSerializer.Deserialize<PlayerDto>(responseContent, _JsonSerializerOptions);

    Assert.Equal("Player 2", responsePlayer?.Name);
    Assert.NotNull(responsePlayer?.Id);
  }

  [Fact]
  public async Task CannotAddTooManyPlayers()
  {
    var newGameDto = new NewGameDto { PlayerName = "Player 1" };
    var gameContent = JsonContent.Create(newGameDto);
    var response = await _client.PostAsync("/games", gameContent);

    var responseContent = await response.Content.ReadAsStringAsync();
    var responseGame = JsonSerializer.Deserialize<GameDto>(responseContent, _JsonSerializerOptions);
    var gameId = responseGame?.Id;

    for (var i = 0; i < 7; i++)
    {
      var player = new PlayerDto { Name = $"Player {i + 2}" };
      var content = JsonContent.Create(player);
      response = await _client.PutAsync($"/games/{gameId}/players", content);

      response.EnsureSuccessStatusCode();
    }

    // Adding a 9th player should fail
    var newPlayer = new PlayerDto { Name = "Player 9" };
    var playerContent = JsonContent.Create(newPlayer);
    response = await _client.PutAsync($"/games/{gameId}/players", playerContent);

    Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
  }

  [Fact]
  public async Task CanStartGame()
  {
    var newGameDto = new NewGameDto { PlayerName = "Player 1" };
    var gameContent = JsonContent.Create(newGameDto);
    var response = await _client.PostAsync("/games", gameContent);

    var responseContent = await response.Content.ReadAsStringAsync();
    var responseGame = JsonSerializer.Deserialize<GameDto>(responseContent, _JsonSerializerOptions);
    var gameId = responseGame?.Id;

    var newPlayer = new PlayerDto { Name = "Player 2" };
    var playerContent = JsonContent.Create(newPlayer);
    await _client.PutAsync($"/games/{gameId}/players", playerContent);

    response = await _client.GetAsync($"/games/{gameId}/start");
    Assert.Equal(HttpStatusCode.OK, response.StatusCode);
  }
}