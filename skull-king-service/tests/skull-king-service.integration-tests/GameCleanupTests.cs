using Microsoft.EntityFrameworkCore;

namespace skull_king_service.integration_tests;

public class GameCleanupTests
{
  // Each test gets its own store, so removing games here cannot touch any
  // other test's games
  private static SkullKingDbContext CreateDb() =>
    new(new DbContextOptionsBuilder<SkullKingDbContext>()
      .UseInMemoryDatabase($"GameCleanupTests-{Guid.NewGuid()}")
      .Options);

  private static Game AddStartedGame(SkullKingDbContext db, string gameId, DateTimeOffset lastActivity)
  {
    var game = Game.Create(new GameId(gameId), new Player($"{gameId} captain"));
    game.AddPlayer(new Player($"{gameId} mate"));
    game.StartGame();
    game.MarkActivity(lastActivity);

    foreach (var playerRounds in game.PlayerRoundInfo)
    {
      db.Players.Add(playerRounds.Player!);
      db.Rounds.AddRange(playerRounds.Rounds);
      db.PlayerRoundInfos.Add(playerRounds);
    }
    db.Games.Add(game);
    db.Hashes.Add(new Hash { GameId = game.Id, Value = game.GetHashCode().ToString() });
    db.SaveChanges();

    return game;
  }

  [Fact]
  public async Task RemovesIdleGamesAndEverythingInThem()
  {
    using var db = CreateDb();
    var now = new DateTimeOffset(2026, 1, 2, 12, 0, 0, TimeSpan.Zero);
    var idle = AddStartedGame(db, "AAAA", now.AddHours(-25));
    var active = AddStartedGame(db, "BBBB", now.AddHours(-1));
    var idlePlayerIds = idle.PlayerRoundInfo.Select(x => x.Player!.Id).ToList();
    var idleRoundIds = idle.PlayerRoundInfo.SelectMany(x => x.Rounds).Select(x => x.Id).ToList();
    var idlePlayerRoundIds = idle.PlayerRoundInfo.Select(x => x.Id).ToList();
    db.ChangeTracker.Clear();

    var removed = await GameCleanup.RemoveIdleGamesAsync(db, now - GameCleanup.DefaultIdleTime);

    Assert.Equal(1, removed);
    db.ChangeTracker.Clear();
    Assert.False(await db.Games.AnyAsync(x => x.Id == "AAAA"));
    Assert.Null(await db.Hashes.FindAsync("AAAA"));
    Assert.False(await db.Players.AnyAsync(x => idlePlayerIds.Contains(x.Id)));
    Assert.False(await db.Rounds.AnyAsync(x => idleRoundIds.Contains(x.Id)));
    Assert.False(await db.PlayerRoundInfos.AnyAsync(x => idlePlayerRoundIds.Contains(x.Id)));

    // The active game is untouched
    var remaining = await db.Games
      .Include(g => g.PlayerRoundInfo).ThenInclude(info => info.Player)
      .Include(g => g.PlayerRoundInfo).ThenInclude(info => info.Rounds)
      .SingleAsync();
    Assert.Equal(active.Id, remaining.Id);
    Assert.Equal(2, remaining.PlayerRoundInfo.Count);
    Assert.All(remaining.PlayerRoundInfo, x => Assert.Single(x.Rounds));
    Assert.NotNull(await db.Hashes.FindAsync("BBBB"));
  }

  [Fact]
  public async Task RemovesNothingWhenNoGameIsIdle()
  {
    using var db = CreateDb();
    var now = DateTimeOffset.UtcNow;
    AddStartedGame(db, "AAAA", now);
    db.ChangeTracker.Clear();

    var removed = await GameCleanup.RemoveIdleGamesAsync(db, now - GameCleanup.DefaultIdleTime);

    Assert.Equal(0, removed);
    Assert.True(await db.Games.AnyAsync());
  }
}
