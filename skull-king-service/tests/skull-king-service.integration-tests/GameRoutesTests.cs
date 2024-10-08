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
    var response = await _client.GetAsync($"/games/0000");

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
  public async Task CanAddPlayerToExistingGameWithNormalizingId()
  {
    var nonNormalizedGameId = "OI01";
    var createdGame = Game.Create(new GameId(nonNormalizedGameId), new Player("Tester"));
    AddGame(createdGame);
    var gameId = createdGame?.Id;

    Assert.NotEqual(nonNormalizedGameId, gameId);

    var newPlayer = new PlayerDto { Name = "Player 2" };
    var playerContent = JsonContent.Create(newPlayer);
    var response = await _client.PutAsync($"/games/{nonNormalizedGameId}/players", playerContent);

    response.EnsureSuccessStatusCode();
    Assert.Equal(HttpStatusCode.OK, response.StatusCode);

    var responseContent = await response.Content.ReadAsStringAsync();
    var responsePlayer = JsonSerializer.Deserialize<PlayerDto>(responseContent, _JsonSerializerOptions);

    Assert.Equal("Player 2", responsePlayer?.Name);
    Assert.NotNull(responsePlayer?.Id);
  }

  [Fact]
  public async Task CanEditPlayerOrder()
  {
    var createdGame = await CreateNewGame("Player 1");
    var gameId = createdGame?.Id;

    for (var i = 0; i < 3; i++)
    {
      var player = new PlayerDto { Name = $"Player {i + 2}" };
      var content = JsonContent.Create(player);
      var result = await _client.PutAsync($"/games/{gameId}/players", content);

      result.EnsureSuccessStatusCode();
    }

    // Now reorder the players (0, 3, 1, 2)
    var game = GetGame(gameId!);
    {
      IReadOnlyList<Guid> newOrder = [
        game.PlayerRoundInfo[0].Player!.Id,
        game.PlayerRoundInfo[3].Player!.Id,
        game.PlayerRoundInfo[1].Player!.Id,
        game.PlayerRoundInfo[2].Player!.Id
      ];

      var playerOrderContent = JsonContent.Create(new PlayerOrderDto
      {
        PlayerOrder = newOrder.ToList(),
        PlayerId = game.PlayerRoundInfo[0].Player!.Id,
        KnownHash = game.GetHashCode().ToString(),
      });
      var response = await _client.PutAsync($"/games/{gameId}/players/reorder", playerOrderContent);

      response.EnsureSuccessStatusCode();
      Assert.Equal(HttpStatusCode.OK, response.StatusCode);

      game = GetGame(gameId!);
      Assert.Equal(newOrder, game.PlayerRoundInfo.Select(x => x.Player!.Id));
    }

    {
      // Now reorder the players (0, 2, 1, 3)
      IReadOnlyList<Guid> newOrder2 = [
        game.PlayerRoundInfo[0].Player!.Id,
        game.PlayerRoundInfo[2].Player!.Id,
        game.PlayerRoundInfo[1].Player!.Id,
        game.PlayerRoundInfo[3].Player!.Id
      ];

      var playerOrderContent = JsonContent.Create(new PlayerOrderDto
      {
        PlayerOrder = newOrder2.ToList(),
        PlayerId = game.PlayerRoundInfo[0].Player!.Id,
        KnownHash = game.GetHashCode().ToString(),
      });
      var response = await _client.PutAsync($"/games/{gameId}/players/reorder", playerOrderContent);

      response.EnsureSuccessStatusCode();
      Assert.Equal(HttpStatusCode.OK, response.StatusCode);

      game = GetGame(gameId!);
      Assert.Equal(newOrder2, game.PlayerRoundInfo.Select(x => x.Player!.Id));
    }
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

    var game = GetGame(gameId!);

    var response = await _client.GetAsync($"/games/{gameId}/start?playerId={game.PlayerRoundInfo[playerIndex].Player!.Id}&knownHash={game.GetHashCode()}");
    if (canStart)
    {
      Assert.Equal(HttpStatusCode.OK, response.StatusCode);
      game = GetGame(gameId!);
      Assert.Equal(GameStatus.BiddingOpen, game.Status);
      Assert.Equal(1, game.PlayerRoundInfo.Select(x => x.Rounds!.Count).Distinct().Single());
    }
    else
    {
      Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }
  }

  [Theory]
  [InlineData(true, GameDifficulty.Easy)]
  [InlineData(true, GameDifficulty.Medium)]
  [InlineData(true, GameDifficulty.Hard)]
  [InlineData(false, GameDifficulty.Easy)]
  public async Task CanStartGameInRandomBidMode(bool useRandomBidMode, GameDifficulty gameDifficulty)
  {
    var createdGame = await CreateNewGame("Player 1");
    var gameId = createdGame?.Id;

    var newPlayer = new PlayerDto { Name = "Player 2" };
    var playerContent = JsonContent.Create(newPlayer);
    await _client.PutAsync($"/games/{gameId}/players", playerContent);

    var game = GetGame(gameId!);

    var response = await _client.GetAsync($"/games/{gameId}/start?playerId={game.PlayerRoundInfo[0].Player!.Id}&randomBidMode={useRandomBidMode}&gameDifficulty={gameDifficulty}&knownHash={game.GetHashCode()}");
    Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    game = GetGame(gameId!);
    Assert.Equal(useRandomBidMode, game.IsRandomBid);

    if (useRandomBidMode)
      Assert.Equal(gameDifficulty, game.Difficulty);

    if (useRandomBidMode)
    {
      response = await _client.GetAsync($"/games/{gameId}/movenext?playerId={game.PlayerRoundInfo[0].Player!.Id}&knownHash={game.GetHashCode()}");
      Assert.Equal(HttpStatusCode.OK, response.StatusCode);
      game = GetGame(gameId!);
      Assert.Equal(GameStatus.BiddingClosed, game.Status);
    }
  }

  [Fact]
  public async Task CannotStartGameWithOutdatedHash()
  {
    var createdGame = await CreateNewGame("Player 1");
    var gameId = createdGame?.Id;

    var newPlayer = new PlayerDto { Name = "Player 2" };
    var playerContent = JsonContent.Create(newPlayer);
    await _client.PutAsync($"/games/{gameId}/players", playerContent);

    var game = GetGame(gameId!);

    var response = await _client.GetAsync($"/games/{gameId}/start?playerId={game.PlayerRoundInfo[0].Player!.Id}&knownHash={gameId!.GetHashCode() + 1}");

    Assert.Equal(HttpStatusCode.PreconditionFailed, response.StatusCode);
  }

  [Fact]
  public async Task CannotStartGameTwice()
  {
    var createdGame = await CreateNewGame("Player 1");
    var gameId = createdGame?.Id;

    var newPlayer = new PlayerDto { Name = "Player 2" };
    var playerContent = JsonContent.Create(newPlayer);
    await _client.PutAsync($"/games/{gameId}/players", playerContent);
    var game = GetGame(gameId!);

    await _client.GetAsync($"/games/{gameId}/start?playerId={game.PlayerRoundInfo[0].Player!.Id}&knownHash={game.GetHashCode()}");
    game = GetGame(gameId!);

    var response = await _client.GetAsync($"/games/{gameId}/start?playerId={game.PlayerRoundInfo[0].Player!.Id}&knownHash={game.GetHashCode()}");
    Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
  }

  [Fact]
  public async Task CanMoveGameToNextPhase()
  {
    var createdGame = await CreateNewGame("Player 1");
    var gameId = createdGame?.Id;

    var newPlayer = new PlayerDto { Name = "Player 2" };
    var playerContent = JsonContent.Create(newPlayer);
    await _client.PutAsync($"/games/{gameId}/players", playerContent);
    var game = GetGame(gameId!);

    await _client.GetAsync($"/games/{gameId}/start?playerId={game.PlayerRoundInfo[0].Player!.Id}&knownHash={game.GetHashCode()}");
    game = GetGame(gameId!);

    var response = await _client.GetAsync($"/games/{gameId}/movenext?playerId={game.PlayerRoundInfo[0].Player!.Id}&knownHash={game.GetHashCode()}");
    Assert.Equal(HttpStatusCode.OK, response.StatusCode);

    game = GetGame(gameId!);
    Assert.Equal(GameStatus.BiddingClosed, game.Status);
    Assert.Equal(1, game.PlayerRoundInfo.Select(x => x.Rounds!.Count).Distinct().Single());
  }

  [Fact]
  public async Task CanMoveGameToPreviousPhase()
  {
    var createdGame = await CreateNewGame("Player 1");
    var gameId = createdGame?.Id;

    var newPlayer = new PlayerDto { Name = "Player 2" };
    var playerContent = JsonContent.Create(newPlayer);
    await _client.PutAsync($"/games/{gameId}/players", playerContent);
    var game = GetGame(gameId!);

    await _client.GetAsync($"/games/{gameId}/start?playerId={game.PlayerRoundInfo[0].Player!.Id}&knownHash={game.GetHashCode()}");
    game = GetGame(gameId!);

    // Set bids and update hash
    game.PlayerRoundInfo[0].SetBid(0);
    game.PlayerRoundInfo[1].SetBid(1);
    _dbContext.Games.Update(game);
    var hash = _dbContext.Hashes.Find(gameId);
    hash!.Value = game.GetHashCode().ToString();
    _dbContext.Hashes.Update(hash);
    _dbContext.SaveChanges();
    var currentHash = game.GetHashCode();

    await _client.GetAsync($"/games/{gameId}/movenext?playerId={game.PlayerRoundInfo[0].Player!.Id}&knownHash={game.GetHashCode()}");
    game = GetGame(gameId!);

    var response = await _client.GetAsync($"/games/{gameId}/moveprevious?playerId={game.PlayerRoundInfo[0].Player!.Id}&knownHash={game.GetHashCode()}");
    Assert.Equal(HttpStatusCode.OK, response.StatusCode);

    game = GetGame(gameId!);
    Assert.Equal(GameStatus.BiddingOpen, game.Status);
    Assert.Equal(currentHash, game.GetHashCode());
  }

  [Fact]
  public async Task CanUpdateBid()
  {
    var createdGame = await CreateNewGame("Player 1");
    var gameId = createdGame?.Id;

    var newPlayer = new PlayerDto { Name = "Player 2" };
    var playerContent = JsonContent.Create(newPlayer);
    await _client.PutAsync($"/games/{gameId}/players", playerContent);
    var game = GetGame(gameId!);

    await _client.GetAsync($"/games/{gameId}/start?playerId={game.PlayerRoundInfo[0].Player!.Id}&knownHash={game.GetHashCode()}");
    game = GetGame(gameId!);

    var response = await _client.GetAsync($"/games/{gameId}/setbid?playerId={game.PlayerRoundInfo[1].Player!.Id}&bid=1&knownHash={game.GetHashCode()}");
    Assert.Equal(HttpStatusCode.OK, response.StatusCode);

    var updatedGame = GetGame(game.Id);
    Assert.Null(updatedGame.PlayerRoundInfo[0].Rounds[^1].Bid);
    Assert.Equal(1, updatedGame.PlayerRoundInfo[1].Rounds[^1].Bid);
  }

  [Fact]
  public async Task CanUpdateScore()
  {
    var createdGame = await CreateNewGame("Player 1");
    var gameId = createdGame?.Id;

    var newPlayer = new PlayerDto { Name = "Player 2" };
    var playerContent = JsonContent.Create(newPlayer);
    await _client.PutAsync($"/games/{gameId}/players", playerContent);
    var game = GetGame(gameId!);

    await _client.GetAsync($"/games/{gameId}/start?playerId={game.PlayerRoundInfo[0].Player!.Id}&knownHash={game.GetHashCode()}");
    game = GetGame(gameId!);
    await _client.GetAsync($"/games/{gameId}/movenext?playerId={game.PlayerRoundInfo[0].Player!.Id}&knownHash={game.GetHashCode()}");
    game = GetGame(gameId!);

    var response = await _client.GetAsync($"/games/{gameId}/setscore?playerId={game.PlayerRoundInfo[1].Player!.Id}&trickstaken=1&bonus=0&knownHash={game.GetHashCode()}");
    Assert.Equal(HttpStatusCode.OK, response.StatusCode);

    var updatedGame = GetGame(game.Id);
    Assert.Null(updatedGame.PlayerRoundInfo[0].Rounds[^1].TricksTaken);
    Assert.Null(updatedGame.PlayerRoundInfo[0].Rounds[^1].Bonus);
    Assert.Equal(1, updatedGame.PlayerRoundInfo[1].Rounds[^1].TricksTaken);
    Assert.Equal(0, updatedGame.PlayerRoundInfo[1].Rounds[^1].Bonus);
  }

  [Fact]
  public async Task CannotGetSingleGameIdWhenThereAreMultiples()
  {
    var createdGame = await CreateNewGame("Player 1");
    var gameId = createdGame?.Id;

    var createdGame2 = await CreateNewGame("Player 1a");
    var gameId2 = createdGame?.Id;

    var response = await _client.GetAsync($"/games/getid");
    Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
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

  private void AddGame(Game game)
  {
    _dbContext.Games.Add(game);
    _dbContext.Hashes.Add(new Hash { GameId = game.Id, Value = game.GetHashCode().ToString() });
    _dbContext.SaveChanges();
  }

  private Game GetGame(string gameId)
  {
    return _dbContext.Games
      .Include(g => g.PlayerRoundInfo)
         .ThenInclude(info => info.Player)
      .Include(g => g.PlayerRoundInfo)
        .ThenInclude(info => info.Rounds)
      .Where(x => x.Id == gameId)
      .AsNoTracking()
      .FirstOrDefault()!;
  }
}