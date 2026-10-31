using Microsoft.EntityFrameworkCore;

public static class GameCleanup
{
  public static readonly TimeSpan DefaultIdleTime = TimeSpan.FromHours(24);

  // Removes every game that has not changed since before the cutoff, with its
  // players, rounds and hash. Returns how many games were removed.
  public static async Task<int> RemoveIdleGamesAsync(SkullKingDbContext db, DateTimeOffset cutoff, CancellationToken cancellationToken = default)
  {
    var idleGames = await db.Games
      .Where(g => g.LastActivityUtc < cutoff)
      .Include(g => g.PlayerRoundInfo)
        .ThenInclude(info => info.Player)
      .Include(g => g.PlayerRoundInfo)
        .ThenInclude(info => info.Rounds)
      .ToListAsync(cancellationToken);

    foreach (var game in idleGames)
    {
      foreach (var playerRounds in game.PlayerRoundInfo)
      {
        db.Rounds.RemoveRange(playerRounds.Rounds);
        db.PlayerRoundInfos.Remove(playerRounds);
        if (playerRounds.Player is not null)
          db.Players.Remove(playerRounds.Player);
      }

      if (await db.Hashes.FindAsync([game.Id], cancellationToken) is { } hash)
        db.Hashes.Remove(hash);

      db.Games.Remove(game);
    }

    if (idleGames.Count > 0)
      await db.SaveChangesAsync(cancellationToken);

    return idleGames.Count;
  }
}

// Games live only in memory, so without this every game ever created would
// stay there until the App Service restarts.
public class GameCleanupService(
  IServiceScopeFactory scopeFactory,
  IConfiguration configuration,
  TimeProvider timeProvider,
  ILogger<GameCleanupService> logger) : BackgroundService
{
  protected override async Task ExecuteAsync(CancellationToken stoppingToken)
  {
    var idleTime = TimeSpan.FromHours(configuration.GetValue("GameCleanup:IdleHours", GameCleanup.DefaultIdleTime.TotalHours));
    var interval = TimeSpan.FromMinutes(configuration.GetValue("GameCleanup:IntervalMinutes", 15.0));

    using var timer = new PeriodicTimer(interval, timeProvider);
    while (await timer.WaitForNextTickAsync(stoppingToken))
    {
      try
      {
        using var scope = scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<SkullKingDbContext>();
        var removed = await GameCleanup.RemoveIdleGamesAsync(db, timeProvider.GetUtcNow() - idleTime, stoppingToken);
        if (removed > 0)
          logger.LogInformation("Removed {Count} game(s) idle for more than {IdleTime}", removed, idleTime);
      }
      catch (Exception ex) when (ex is not OperationCanceledException)
      {
        // Never let one failed sweep stop the service
        logger.LogError(ex, "Removing idle games failed");
      }
    }
  }
}
