using Microsoft.EntityFrameworkCore;

public static class GameRoutes
{
  public static void Register(WebApplication app, string cors)
  {
    app.MapPost("/games", async (NewGameDto gameInfo, HttpContext httpContext, SkullKingDbContext db) =>
    {
      // We may want to setup a specific game ID for testing purposes
      var gameId = gameInfo.PlayerName == "__Sample Game 1__"
        ? new GameId("ABCD")
        : gameInfo.PlayerName == "__Sample Game 2__"
        ? new GameId("1234")
        : new GameId();

      var existingGame = await db.Games.Where(x => x.Id == gameId.Value).FirstOrDefaultAsync();
      if (existingGame is not null)
      {
        httpContext.Response.StatusCode = StatusCodes.Status409Conflict;
        return;
      }

      var game = Game.Create(gameId, new Player(gameInfo.PlayerName));
      db.Games.Add(game);
      await UpdateHashAndSaveAsync(db, game);
      await db.SaveChangesAsync();

      httpContext.Response.StatusCode = 201;
      await httpContext.Response.WriteAsJsonAsync(game.MapToDto());
    })
    .WithName("CreateGame")
    .RequireCors(cors);

    app.MapGet("/games/{id}", async (string id, HttpContext httpContext, SkullKingDbContext db, string? knownHash = null) =>
    {
      if (knownHash is not null)
      {
        var currentHash = db.Hashes.Find(id);
        if (currentHash?.Value == knownHash)
        {
          httpContext.Response.StatusCode = StatusCodes.Status304NotModified;
          return;
        }
      }

      var game = await GetFullGame(id, db);
      if (game is null)
      {
        httpContext.Response.StatusCode = StatusCodes.Status404NotFound;
        return;
      }

      await httpContext.Response.WriteAsJsonAsync(game.MapToDto());
    })
    .WithName("GetGame")
    .RequireCors(cors);

    app.MapPut("/games/{id}/players", async (string id, PlayerDto player, HttpContext httpContext, SkullKingDbContext db) =>
    {
      var game = await GetFullGame(id, db);
      if (game is null)
      {
        httpContext.Response.StatusCode = StatusCodes.Status404NotFound;
        return;
      }

      var newPlayer = new Player(player.Name!);

      try
      {
        db.Players.Add(newPlayer);
        game.AddPlayer(newPlayer);
        db.Games.Update(game);
        await UpdateHashAndSaveAsync(db, game);

        await httpContext.Response.WriteAsJsonAsync(newPlayer);
      }
      catch (ArgumentException)
      {
        httpContext.Response.StatusCode = StatusCodes.Status400BadRequest;
      }
    })
    .WithName("AddPlayerToGame")
    .RequireCors(cors);

    app.MapGet("/games/{id}/start", async (string id, HttpContext httpContext, SkullKingDbContext db) =>
    {
      var game = await GetFullGame(id, db);
      if (game is null)
      {
        httpContext.Response.StatusCode = StatusCodes.Status404NotFound;
        return;
      }

      try
      {
        game.StartGame();
        db.Games.Update(game);
        db.RoundInfos.AddRange(game.RoundInfos);
        await UpdateHashAndSaveAsync(db, game);

        await httpContext.Response.WriteAsJsonAsync(game);
      }
      catch (ArgumentException)
      {
        httpContext.Response.StatusCode = StatusCodes.Status400BadRequest;
      }
    })
    .WithName("StartGame")
    .RequireCors(cors);
  }

  private static async Task<Game?> GetFullGame(string id, SkullKingDbContext db)
  {
    return await db.Games
      .Include(game => game.Players)
      .Include(game => game.RoundInfos)
        .ThenInclude(roundinfo => roundinfo.PlayerRounds)!
        .ThenInclude(playerRound => playerRound.Round)
      .Where(x => x.Id == id)
      .FirstOrDefaultAsync();
  }

  private static async Task UpdateHashAndSaveAsync(SkullKingDbContext db, Game game)
  {
    var existingHash = await db.Hashes.FindAsync(game.Id);
    if (existingHash is not null)
    {
      existingHash.Value = game.GetHashCode().ToString();
      db.Hashes.Update(existingHash);
    }
    else
    {
      db.Hashes.Add(new Hash { GameId = game.Id, Value = game.GetHashCode().ToString() });
    }

    await db.SaveChangesAsync();
  }
}