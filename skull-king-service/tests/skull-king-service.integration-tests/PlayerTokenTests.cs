using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

namespace skull_king_service.integration_tests;

public class PlayerTokenTests(TestFixture fixture) : PlayerTokenTestsBase(fixture), IClassFixture<TestFixture>
{
  [Fact]
  public async Task CreateAndJoinEachReturnTheirOwnToken()
  {
    var (game, captainToken) = await CreateGame("Captain");
    var mate = await JoinGame(game.Id!, "Mate");

    Assert.Matches("^[0-9A-F]{32}$", captainToken);
    Assert.Matches("^[0-9A-F]{32}$", mate.PlayerToken);
    Assert.NotEqual(captainToken, mate.PlayerToken);
  }

  [Fact]
  public async Task GameDtoNeverContainsTokens()
  {
    var (game, captainToken) = await CreateGame("Captain");
    var mate = await JoinGame(game.Id!, "Mate");

    var response = await _client.GetAsync($"/games/{game.Id}");
    response.EnsureSuccessStatusCode();
    var json = await response.Content.ReadAsStringAsync();

    Assert.DoesNotContain(captainToken, json, StringComparison.OrdinalIgnoreCase);
    Assert.DoesNotContain(mate.PlayerToken, json, StringComparison.OrdinalIgnoreCase);
    Assert.DoesNotContain("token", json, StringComparison.OrdinalIgnoreCase);

    // The start response carries the game too
    var gameDto = JsonSerializer.Deserialize<GameDto>(json, _jsonSerializerOptions)!;
    var startResponse = await PostAs(captainToken, $"/games/{game.Id}/start?knownHash={gameDto.Hash}");
    Assert.Equal(HttpStatusCode.OK, startResponse.StatusCode);
    var startJson = await startResponse.Content.ReadAsStringAsync();
    Assert.DoesNotContain(captainToken, startJson, StringComparison.OrdinalIgnoreCase);
    Assert.DoesNotContain(mate.PlayerToken, startJson, StringComparison.OrdinalIgnoreCase);
    Assert.DoesNotContain("token", startJson, StringComparison.OrdinalIgnoreCase);
  }

  [Fact]
  public async Task ActionWithAnotherPlayersPublicIdFails()
  {
    var (game, captainToken) = await CreateGame("Captain");
    var mate = await JoinGame(game.Id!, "Mate");
    var current = await ReadGame(game.Id!);
    var captainId = current.PlayerRoundInfo![0].Player!.Id;

    // The captain's public id, as anyone reading the game can see it, is not enough
    var response = await PostAs(null, $"/games/{game.Id}/start?playerId={captainId}&knownHash={current.Hash}");
    Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);

    // Nor is another player's token, or one that was made up
    response = await PostAs(mate.PlayerToken, $"/games/{game.Id}/start?knownHash={current.Hash}");
    Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    response = await PostAs(captainId.ToString("N").ToUpperInvariant(), $"/games/{game.Id}/start?knownHash={current.Hash}");
    Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);

    // The captain's own token works
    response = await PostAs(captainToken, $"/games/{game.Id}/start?knownHash={current.Hash}");
    Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    Assert.Equal(GameStatus.BiddingOpen, (await ReadGame(game.Id!)).Status);
  }

  [Fact]
  public async Task TokenFromAnotherGameIsRejected()
  {
    var (game, _) = await CreateGame("Captain");
    await JoinGame(game.Id!, "Mate");
    var (_, otherCaptainToken) = await CreateGame("Other Captain");
    var current = await ReadGame(game.Id!);

    var response = await PostAs(otherCaptainToken, $"/games/{game.Id}/start?knownHash={current.Hash}");
    Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
  }

  [Fact]
  public async Task PlayersSetTheirOwnBidAndTheCaptainCanSetAnyone()
  {
    var (game, captainToken) = await CreateGame("Captain");
    var mate = await JoinGame(game.Id!, "Mate");
    var current = await ReadGame(game.Id!);
    await PostAs(captainToken, $"/games/{game.Id}/start?knownHash={current.Hash}");
    current = await ReadGame(game.Id!);
    var captainId = current.PlayerRoundInfo![0].Player!.Id;

    // A mate cannot set the captain's bid
    var response = await PostAs(mate.PlayerToken, $"/games/{game.Id}/setbid?playerId={captainId}&bid=1&knownHash={current.Hash}");
    Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);

    // ... but can set their own
    response = await PostAs(mate.PlayerToken, $"/games/{game.Id}/setbid?playerId={mate.Id}&bid=1&knownHash={current.Hash}");
    Assert.Equal(HttpStatusCode.OK, response.StatusCode);

    // ... and the captain can set the mate's
    current = await ReadGame(game.Id!);
    response = await PostAs(captainToken, $"/games/{game.Id}/setbid?playerId={mate.Id}&bid=0&knownHash={current.Hash}");
    Assert.Equal(HttpStatusCode.OK, response.StatusCode);

    // Only the captain moves the game on
    current = await ReadGame(game.Id!);
    response = await PostAs(mate.PlayerToken, $"/games/{game.Id}/movenext?knownHash={current.Hash}");
    Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    response = await PostAs(captainToken, $"/games/{game.Id}/movenext?knownHash={current.Hash}");
    Assert.Equal(HttpStatusCode.OK, response.StatusCode);

    // Same rules for scores
    current = await ReadGame(game.Id!);
    response = await PostAs(mate.PlayerToken, $"/games/{game.Id}/setscore?playerId={captainId}&tricksTaken=0&bonus=0&knownHash={current.Hash}");
    Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    response = await PostAs(mate.PlayerToken, $"/games/{game.Id}/setscore?playerId={mate.Id}&tricksTaken=0&bonus=0&knownHash={current.Hash}");
    Assert.Equal(HttpStatusCode.OK, response.StatusCode);
  }

  [Fact]
  public async Task OnlyThePlayerOrCaptainCanRenameAPlayer()
  {
    var (game, captainToken) = await CreateGame("Captain");
    var mate = await JoinGame(game.Id!, "Mate");
    var current = await ReadGame(game.Id!);
    var captainId = current.PlayerRoundInfo![0].Player!.Id;

    var response = await SendAs(HttpMethod.Put, null, $"/games/{game.Id}/players", JsonContent.Create(new PlayerDto { Id = captainId, Name = "Renamed" }));
    Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);

    response = await SendAs(HttpMethod.Put, mate.PlayerToken, $"/games/{game.Id}/players", JsonContent.Create(new PlayerDto { Id = captainId, Name = "Renamed" }));
    Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);

    response = await SendAs(HttpMethod.Put, mate.PlayerToken, $"/games/{game.Id}/players", JsonContent.Create(new PlayerDto { Id = mate.Id, Name = "Mate Renamed" }));
    Assert.Equal(HttpStatusCode.OK, response.StatusCode);

    response = await SendAs(HttpMethod.Put, captainToken, $"/games/{game.Id}/players", JsonContent.Create(new PlayerDto { Id = mate.Id, Name = "Renamed By Captain" }));
    Assert.Equal(HttpStatusCode.OK, response.StatusCode);

    current = await ReadGame(game.Id!);
    Assert.Equal("Captain", current.PlayerRoundInfo![0].Player!.Name);
    Assert.Equal("Renamed By Captain", current.PlayerRoundInfo![1].Player!.Name);
  }

  [Fact]
  public async Task OnlyTheCaptainCanReorderPlayers()
  {
    var (game, captainToken) = await CreateGame("Captain");
    var mate = await JoinGame(game.Id!, "Mate");
    var otherMate = await JoinGame(game.Id!, "Other Mate");
    var current = await ReadGame(game.Id!);
    var captainId = current.PlayerRoundInfo![0].Player!.Id;

    PlayerOrderDto Order() => new()
    {
      PlayerOrder = [captainId, otherMate.Id, mate.Id],
      KnownHash = current.Hash!,
    };

    var response = await SendAs(HttpMethod.Put, mate.PlayerToken, $"/games/{game.Id}/players/reorder", JsonContent.Create(Order()));
    Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);

    response = await SendAs(HttpMethod.Put, captainToken, $"/games/{game.Id}/players/reorder", JsonContent.Create(Order()));
    Assert.Equal(HttpStatusCode.OK, response.StatusCode);
  }

  [Theory]
  [InlineData("start")]
  [InlineData("reset")]
  [InlineData("movenext")]
  [InlineData("moveprevious")]
  [InlineData("setbid")]
  [InlineData("setscore")]
  public async Task StateChangingRoutesDoNotAnswerGet(string action)
  {
    var (game, _) = await CreateGame("Captain");

    var response = await _client.GetAsync($"/games/{game.Id}/{action}?knownHash={game.Hash}");

    Assert.Equal(HttpStatusCode.MethodNotAllowed, response.StatusCode);
  }
}

// Removing players deletes rows, so it runs against its own database
public class PlayerRemovalTokenTests(IsolatedTestFixture fixture) : PlayerTokenTestsBase(fixture), IClassFixture<IsolatedTestFixture>
{
  [Fact]
  public async Task OnlyThePlayerOrCaptainCanRemoveAPlayer()
  {
    var (game, captainToken) = await CreateGame("Captain");
    var mate = await JoinGame(game.Id!, "Mate");
    var otherMate = await JoinGame(game.Id!, "Other Mate");
    var current = await ReadGame(game.Id!);
    var captainId = current.PlayerRoundInfo![0].Player!.Id;

    // Naming the captain as the requester is not enough
    var response = await SendAs(HttpMethod.Delete, null, $"/games/{game.Id}/players/{mate.Id}?knownHash={current.Hash}&requestingPlayerId={captainId}");
    Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);

    // A mate cannot remove another mate
    response = await SendAs(HttpMethod.Delete, otherMate.PlayerToken, $"/games/{game.Id}/players/{mate.Id}?knownHash={current.Hash}");
    Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);

    // A mate can leave
    response = await SendAs(HttpMethod.Delete, otherMate.PlayerToken, $"/games/{game.Id}/players/{otherMate.Id}?knownHash={current.Hash}");
    Assert.Equal(HttpStatusCode.OK, response.StatusCode);

    // The captain can remove a mate
    current = await ReadGame(game.Id!);
    response = await SendAs(HttpMethod.Delete, captainToken, $"/games/{game.Id}/players/{mate.Id}?knownHash={current.Hash}");
    Assert.Equal(HttpStatusCode.OK, response.StatusCode);

    current = await ReadGame(game.Id!);
    Assert.Single(current.PlayerRoundInfo!);
  }
}

public abstract class PlayerTokenTestsBase(TestFixture fixture)
{
  protected readonly HttpClient _client = fixture.Client;
  protected readonly JsonSerializerOptions _jsonSerializerOptions = fixture.JsonSerializerOptions;

  protected async Task<(CreatedGameDto Game, string Token)> CreateGame(string playerName)
  {
    var response = await _client.PostAsync("/games", JsonContent.Create(new NewGameDto { PlayerName = playerName }));
    Assert.Equal(HttpStatusCode.Created, response.StatusCode);

    var created = JsonSerializer.Deserialize<CreatedGameDto>(await response.Content.ReadAsStringAsync(), _jsonSerializerOptions)!;
    return (created, created.PlayerToken);
  }

  protected async Task<JoinedPlayerDto> JoinGame(string gameId, string playerName)
  {
    var response = await _client.PutAsync($"/games/{gameId}/players", JsonContent.Create(new PlayerDto { Name = playerName }));
    response.EnsureSuccessStatusCode();

    return JsonSerializer.Deserialize<JoinedPlayerDto>(await response.Content.ReadAsStringAsync(), _jsonSerializerOptions)!;
  }

  protected async Task<GameDto> ReadGame(string gameId)
  {
    var response = await _client.GetAsync($"/games/{gameId}");
    response.EnsureSuccessStatusCode();

    return JsonSerializer.Deserialize<GameDto>(await response.Content.ReadAsStringAsync(), _jsonSerializerOptions)!;
  }

  protected Task<HttpResponseMessage> PostAs(string? playerToken, string uri)
  {
    return SendAs(HttpMethod.Post, playerToken, uri);
  }

  protected Task<HttpResponseMessage> SendAs(HttpMethod method, string? playerToken, string uri, HttpContent? content = null)
  {
    var request = new HttpRequestMessage(method, uri) { Content = content };
    if (playerToken is not null)
      request.Headers.Add(GameRoutes.PlayerTokenHeader, playerToken);

    return _client.SendAsync(request);
  }
}
