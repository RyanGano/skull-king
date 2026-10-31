using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;

namespace skull_king_service.integration_tests;

// The database does not hand rows back in the order they were written: once any
// row is deleted, later inserts land in the freed slots. Everything about a game
// is positional - the captain is the first player, the current round is the last
// one - so these tests keep that ordering honest even when other games on the
// same server come and go.
public class GameOrderingTests : IClassFixture<TestFixture>
{
  private readonly HttpClient _client;
  private readonly JsonSerializerOptions _JsonSerializerOptions;

  public GameOrderingTests(TestFixture fixture)
  {
    _client = fixture.Client;
    _JsonSerializerOptions = fixture.JsonSerializerOptions;
  }

  [Fact]
  public void RowsComeBackFromTheStoreOutOfInsertionOrder()
  {
    // Guards the assumption the rest of these tests rest on. If this ever starts
    // failing because the provider began preserving insertion order, the
    // explicit ordering in the model is still the thing to rely on.
    var options = new DbContextOptionsBuilder<SkullKingDbContext>()
      .UseInMemoryDatabase($"ordering-probe-{Guid.NewGuid()}").Options;

    var ids = new List<Guid>();
    using (var db = new SkullKingDbContext(options))
    {
      for (var maxBid = 1; maxBid <= 6; maxBid++)
      {
        var round = new Round(maxBid);
        ids.Add(round.Id);
        db.Rounds.Add(round);
      }
      db.SaveChanges();
    }

    using (var db = new SkullKingDbContext(options))
    {
      foreach (var id in new[] { ids[1], ids[3] })
        db.Rounds.Remove(db.Rounds.Find(id)!);
      db.SaveChanges();
    }

    using (var db = new SkullKingDbContext(options))
    {
      db.Rounds.Add(new Round(7));
      db.Rounds.Add(new Round(8));
      db.SaveChanges();
    }

    using (var db = new SkullKingDbContext(options))
      Assert.NotEqual([1, 3, 5, 6, 7, 8], db.Rounds.Select(x => x.MaxBid).ToList());
  }

  [Fact]
  public async Task RoundsStayInPlayingOrderAfterAnotherGameIsDeleted()
  {
    var playing = await StartGame("Playing", 4);

    // Another group is mid-game on the same server
    var leaving = await StartGame("Leaving", 4);

    for (var round = 0; round < 3; round++)
    {
      await MoveNext(playing);
      await MoveNext(playing);
      await MoveNext(leaving);
      await MoveNext(leaving);
    }

    // Park the playing game on bidding closed so the next move adds a round
    while ((await GetGame(playing.Id))!.Status != GameStatus.BiddingClosed)
      Assert.Equal(HttpStatusCode.OK, await MoveNext(playing));

    // The other group all leave, which deletes their game and frees the rows
    // that the playing game's next round will be written into
    await EveryoneLeaves(leaving);

    Assert.Null(await GetGame(leaving.Id));
    Assert.Equal(HttpStatusCode.OK, await MoveNext(playing));

    var updated = (await GetGame(playing.Id))!;
    foreach (var playerRounds in updated.PlayerRoundInfo!)
    {
      // Rounds run 1, 2, 3, ... so maxBid doubles as the round number here
      Assert.Equal(
        Enumerable.Range(1, playerRounds.Rounds!.Count),
        playerRounds.Rounds!.Select(x => x.MaxBid));

      // The last round is the one being bid on, so it must not carry an old bid
      Assert.Null(playerRounds.Rounds![^1].Bid);
    }
  }

  [Fact]
  public async Task CaptainStaysTheSamePlayerAfterAnotherGameIsDeleted()
  {
    var playing = await StartGame("Captain", 4);
    var seating = playing.Players.Select(x => x.Id).ToList();

    var leaving = await StartGame("Departing", 4);
    await EveryoneLeaves(leaving);

    // Adding players to a third game reuses the rows the departing game freed
    var newcomers = await StartGame("Newcomers", 4);

    var updated = (await GetGame(playing.Id))!;
    Assert.Equal(seating, updated.PlayerRoundInfo!.Select(x => x.Player!.Id));
    Assert.Equal(playing.Players[0].Id, updated.PlayerRoundInfo![0].Player!.Id);

    // Authorization follows the seating: each game's creator can still act as captain
    Assert.Equal(HttpStatusCode.OK, await MoveNext(playing));
    Assert.Equal(HttpStatusCode.OK, await MoveNext(newcomers));
  }

  [Fact]
  public async Task HashFromAGetIsAlwaysAcceptedByTheNextUpdate()
  {
    var game = await StartGame("Hash", 4);

    var noise = await StartGame("Noise", 4);
    await EveryoneLeaves(noise);

    // A client reads the game and immediately acts on it, all the way to the end
    for (var move = 0; move < 12; move++)
      Assert.Equal(HttpStatusCode.OK, await MoveNext(game));
  }

  // A game as its players hold it: the id plus every seat's own token, in seating order.
  private record SeatedGame(string Id, List<(Guid Id, string Token)> Players);

  private async Task<HttpStatusCode> MoveNext(SeatedGame seated)
  {
    var game = await GetGame(seated.Id);
    var response = await Send(HttpMethod.Post,
      $"/games/{seated.Id}/movenext?knownHash={game!.Hash}", seated.Players[0].Token);

    return response.StatusCode;
  }

  private async Task EveryoneLeaves(SeatedGame seated)
  {
    foreach (var (id, token) in seated.Players)
    {
      var current = await GetGame(seated.Id);
      if (current is null)
        break;

      await Send(HttpMethod.Delete, $"/games/{seated.Id}/players/{id}?knownHash={current.Hash}", token);
    }
  }

  private async Task<GameDto?> GetGame(string gameId)
  {
    var response = await _client.GetAsync($"/games/{gameId}");
    var content = await response.Content.ReadAsStringAsync();

    return string.IsNullOrWhiteSpace(content)
      ? null
      : JsonSerializer.Deserialize<GameDto>(content, _JsonSerializerOptions);
  }

  private async Task<SeatedGame> StartGame(string playerPrefix, int playerCount)
  {
    var response = await _client.PostAsync("/games",
      JsonContent.Create(new NewGameDto { PlayerName = $"{playerPrefix} 1" }));
    var created = JsonSerializer.Deserialize<CreatedGameDto>(
      await response.Content.ReadAsStringAsync(), _JsonSerializerOptions)!;
    var players = new List<(Guid Id, string Token)> { (created.PlayerRoundInfo![0].Player!.Id, created.PlayerToken) };

    for (var player = 2; player <= playerCount; player++)
    {
      var joined = await _client.PutAsync($"/games/{created.Id}/players",
        JsonContent.Create(new PlayerDto { Name = $"{playerPrefix} {player}" }));
      var seat = JsonSerializer.Deserialize<JoinedPlayerDto>(
        await joined.Content.ReadAsStringAsync(), _JsonSerializerOptions)!;
      players.Add((seat.Id, seat.PlayerToken));
    }

    var game = (await GetGame(created.Id!))!;
    var started = await Send(HttpMethod.Post, $"/games/{game.Id}/start?knownHash={game.Hash}", created.PlayerToken);
    Assert.Equal(HttpStatusCode.OK, started.StatusCode);

    return new SeatedGame(created.Id!, players);
  }

  private Task<HttpResponseMessage> Send(HttpMethod method, string uri, string playerToken)
  {
    var request = new HttpRequestMessage(method, uri);
    request.Headers.Add(GameRoutes.PlayerTokenHeader, playerToken);
    return _client.SendAsync(request);
  }
}
