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
    var gameDto = await CreateNewGame("Test Player");
    var gameId = gameDto?.Id;

    var game = await _dbContext.Games.Include(g => g.PlayerRoundInfo).ThenInclude(info => info.Player).FirstOrDefaultAsync(x => x.Id == gameId);

    Assert.NotNull(game);
    Assert.Equal("Test Player", game.PlayerRoundInfo.Single().Player?.Name);
    Assert.Equal(GameStatus.AcceptingPlayers, game.Status);
  }

  [Fact]
  public async Task CannotCreateGameWithSameId()
  {
    var newGameDto = new NewGameDto { PlayerName = "__Sample Game 2__" };
    var content = JsonContent.Create(newGameDto);
    var response = await _client.PostAsync("/games", content);

    response = await _client.PostAsync("/games", content);
    Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
  }

  [Fact]
  public async Task CanRetrieveGameWithValidId()
  {
    var gameDto = await CreateNewGame("Test Player");
    var gameId = gameDto?.Id;

    var response = await _client.GetAsync($"/games/{gameId}");

    response.EnsureSuccessStatusCode();
    Assert.Equal(HttpStatusCode.OK, response.StatusCode);

    var responseContent = await response.Content.ReadAsStringAsync();
    var responseGame = JsonSerializer.Deserialize<GameDto>(responseContent, _JsonSerializerOptions);
    var lookupGameId = responseGame?.Id;

    Assert.Equal(gameId, lookupGameId);
  }

  [Fact]
  public async Task RetrievingGameWithCurrentHashSavesBandwidth()
  {
    var createdGame = await CreateNewGame("Test Player");
    var gameId = createdGame?.Id;
    var gameHash = createdGame?.Hash;

    var response = await _client.GetAsync($"/games/{gameId}/?knownHash={gameHash}");
    Assert.Equal(HttpStatusCode.NotModified, response.StatusCode);

    response = await _client.GetAsync($"/games/{gameId}/?hash={gameId!.GetHashCode()}");
    Assert.Equal(HttpStatusCode.OK, response.StatusCode);

    var responseContent = await response.Content.ReadAsStringAsync();
    var secondResponseGame = JsonSerializer.Deserialize<GameDto>(responseContent, _JsonSerializerOptions);
    var lookupGameId = secondResponseGame?.Id;

    Assert.Equal(gameId, lookupGameId);
    Assert.Equivalent(createdGame, secondResponseGame);
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
    var createdGame = await CreateNewGame("Tester");
    var gameId = createdGame?.Id;

    var newPlayer = new PlayerDto { Name = "Player 2" };
    var playerContent = JsonContent.Create(newPlayer);
    var response = await _client.PutAsync($"/games/{gameId}/players", playerContent);

    response.EnsureSuccessStatusCode();
    Assert.Equal(HttpStatusCode.OK, response.StatusCode);

    var responseContent = await response.Content.ReadAsStringAsync();
    var responsePlayer = JsonSerializer.Deserialize<PlayerDto>(responseContent, _JsonSerializerOptions);

    Assert.Equal("Player 2", responsePlayer?.Name);
    Assert.NotNull(responsePlayer?.Id);
  }

  [Fact]
  public async Task CanEditPlayerName()
  {
    var createdGame = await CreateNewGame("Tester");
    var gameId = createdGame?.Id;

    var newPlayer = new PlayerDto { Name = "Player 2" };
    var playerContent = JsonContent.Create(newPlayer);
    var response = await _client.PutAsync($"/games/{gameId}/players", playerContent);

    response.EnsureSuccessStatusCode();
    Assert.Equal(HttpStatusCode.OK, response.StatusCode);

    var responseContent = await response.Content.ReadAsStringAsync();
    var responsePlayer = JsonSerializer.Deserialize<PlayerDto>(responseContent, _JsonSerializerOptions);

    var playerId = responsePlayer?.Id;
    playerContent = JsonContent.Create(responsePlayer! with { Name = "Updated Name" });
    response = await _client.PutAsync($"/games/{gameId}/players", playerContent);

    response.EnsureSuccessStatusCode();
    Assert.Equal(HttpStatusCode.OK, response.StatusCode);

    responseContent = await response.Content.ReadAsStringAsync();
    responsePlayer = JsonSerializer.Deserialize<PlayerDto>(responseContent, _JsonSerializerOptions);

    Assert.Equal("Updated Name", responsePlayer?.Name);
    Assert.Equal(playerId, responsePlayer?.Id);
  }

  [Fact]
  public async Task CannotAddTooManyPlayers()
  {
    var createdGame = await CreateNewGame("Player 1");
    var gameId = createdGame?.Id;

    for (var i = 0; i < 7; i++)
    {
      var player = new PlayerDto { Name = $"Player {i + 2}" };
      var content = JsonContent.Create(player);
      var result = await _client.PutAsync($"/games/{gameId}/players", content);

      result.EnsureSuccessStatusCode();
    }

    // Adding a 9th player should fail
    var newPlayer = new PlayerDto { Name = "Player 9" };
    var playerContent = JsonContent.Create(newPlayer);
    var response = await _client.PutAsync($"/games/{gameId}/players", playerContent);

    Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
  }

  [Theory]
  [InlineData(0, true)]
  [InlineData(1, false)]
  public async Task OnlyControllingPlayerCanStartGame(int playerIndex, bool canStart)
  {
    var createdGame = await CreateNewGame("Player 1");
    var gameId = createdGame?.Id;

    var newPlayer = new PlayerDto { Name = "Player 2" };
    var playerContent = JsonContent.Create(newPlayer);
    await _client.PutAsync($"/games/{gameId}/players", playerContent);

    var game = GetGame(gameId);

    var response = await _client.GetAsync($"/games/{gameId}/start?playerId={game.PlayerRoundInfo[playerIndex].Player.Id}");

    if (canStart)
      Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    else
      Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
  }

  private async Task<GameDto?> CreateNewGame(string playerName)
  {
    var newGameDto = new NewGameDto { PlayerName = playerName };
    var content = JsonContent.Create(newGameDto);
    var response = await _client.PostAsync("/games", content);

    var responseContent = await response.Content.ReadAsStringAsync();
    var responseGame = JsonSerializer.Deserialize<GameDto>(responseContent, _JsonSerializerOptions);

    return responseGame;
  }

  private Game GetGame(string gameId)
  {
    return _dbContext.Games.Include(g => g.PlayerRoundInfo).ThenInclude(info => info.Player).FirstOrDefault(x => x.Id == gameId);
  }
}