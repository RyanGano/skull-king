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
      db.Players.Add(game.PlayerRoundInfo.Single().Player!);
      db.Rounds.AddRange(game.PlayerRoundInfo.SelectMany(x => x.Rounds!));
      db.PlayerRoundInfos.Add(game.PlayerRoundInfo.Single());
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

      try
      {
        if (db.Players.Find(player.Id) is { } playerModel)
        {
          playerModel.ChangeName(player.Name!);
          db.Players.Update(playerModel);
        }
        else
        {
          playerModel = new Player(player.Name!);
          var newPlayerRounds = game.AddPlayer(playerModel);
          db.Players.Add(newPlayerRounds.Player!);
          db.Rounds.AddRange(newPlayerRounds.Rounds);
          db.PlayerRoundInfos.Add(newPlayerRounds);
        }

        db.Games.Update(game);
        await UpdateHashAndSaveAsync(db, game);

        await httpContext.Response.WriteAsJsonAsync(playerModel.MapToDto());
      }
      catch (ArgumentException)
      {
        httpContext.Response.StatusCode = StatusCodes.Status400BadRequest;
      }
    })
    .WithName("AddPlayerToGame")
    .RequireCors(cors);

    app.MapGet("/games/{id}/start", async (string id, Guid playerId, string knownHash, HttpContext httpContext, SkullKingDbContext db) =>
    {
      // Check the knownHash compared to current stored hash
      // Do not allow updates if the user's hash doesn't match the current hash
      var currentHash = db.Hashes.Find(id);
      if (currentHash?.Value != knownHash)
      {
        httpContext.Response.StatusCode = StatusCodes.Status412PreconditionFailed;
        return;
      }

      var game = await GetFullGame(id, db);
      if (game is null)
      {
        httpContext.Response.StatusCode = StatusCodes.Status404NotFound;
        return;
      }

      if (game.PlayerRoundInfo.First().Player!.Id != playerId)
      {
        httpContext.Response.StatusCode = StatusCodes.Status401Unauthorized;
        return;
      }

      try
      {
        game.StartGame();
        db.Rounds.AddRange(game.PlayerRoundInfo.Select(x => x.Rounds!.Last()));
        db.PlayerRoundInfos.UpdateRange(game.PlayerRoundInfo);
        db.Games.Update(game);
        await UpdateHashAndSaveAsync(db, game);

        await httpContext.Response.WriteAsJsonAsync(game);
      }
      catch (Exception ex) when (ex is ArgumentException or InvalidOperationException)
      {
        httpContext.Response.StatusCode = StatusCodes.Status400BadRequest;
      }
    })
    .WithName("StartGame")
    .RequireCors(cors);

    app.MapGet("/games/{id}/movenext", async (string id, Guid playerId, string knownHash, HttpContext httpContext, SkullKingDbContext db) =>
    {
      var game = await GetFullGame(id, db);
      if (game is null)
      {
        httpContext.Response.StatusCode = StatusCodes.Status404NotFound;
        return;
      }

      if (game.PlayerRoundInfo.First().Player!.Id != playerId)
      {
        httpContext.Response.StatusCode = StatusCodes.Status401Unauthorized;
        return;
      }

      // Check the knownHash compared to current stored hash
      // Do not allow updates if the user's hash doesn't match the current hash
      var currentHash = db.Hashes.Find(id);
      if (currentHash?.Value != knownHash)
      {
        httpContext.Response.StatusCode = StatusCodes.Status409Conflict;
        return;
      }

      try
      {
        // Move the game to the next phase
        game.MoveToNextPhase();

        // Store the new data in the database as needed
        if (game.Status == GameStatus.BiddingOpen)
          db.Rounds.AddRange(game.PlayerRoundInfo.Select(x => x.Rounds!.Last()));

        db.Games.Update(game);
        await UpdateHashAndSaveAsync(db, game);
      }
      catch (Exception ex) when (ex is ArgumentException or InvalidOperationException)
      {
        httpContext.Response.StatusCode = StatusCodes.Status400BadRequest;
      }
    })
    .WithName("MoveToNextPhase")
    .RequireCors(cors);

    app.MapGet("/games/{id}/moveprevious", async (string id, Guid playerId, string knownHash, HttpContext httpContext, SkullKingDbContext db) =>
    {
      var game = await GetFullGame(id, db);
      if (game is null)
      {
        httpContext.Response.StatusCode = StatusCodes.Status404NotFound;
        return;
      }

      if (game.PlayerRoundInfo.First().Player!.Id != playerId)
      {
        httpContext.Response.StatusCode = StatusCodes.Status401Unauthorized;
        return;
      }

      // Check the knownHash compared to current stored hash
      // Do not allow updates if the user's hash doesn't match the current hash
      var currentHash = db.Hashes.Find(id);
      if (currentHash?.Value != knownHash)
      {
        httpContext.Response.StatusCode = StatusCodes.Status409Conflict;
        return;
      }

      try
      {
        // Move the game to the next phase
        game.MoveToPreviousPhase();

        db.Games.Update(game);
        await UpdateHashAndSaveAsync(db, game);
      }
      catch (Exception ex) when (ex is ArgumentException or InvalidOperationException)
      {
        httpContext.Response.StatusCode = StatusCodes.Status400BadRequest;
      }
    })
    .WithName("MoveToPreviousPhase")
    .RequireCors(cors);

    app.MapGet("/games/{id}/setbid", async (string id, int bid, Guid playerId, string knownHash, HttpContext httpContext, SkullKingDbContext db) =>
    {
      var game = await GetFullGame(id, db);
      if (game is null)
      {
        httpContext.Response.StatusCode = StatusCodes.Status404NotFound;
        return;
      }

      var playerRoundInfo = game.PlayerRoundInfo.SingleOrDefault(x => x.Player!.Id == playerId);

      if (playerRoundInfo is null)
      {
        httpContext.Response.StatusCode = StatusCodes.Status401Unauthorized;
        return;
      }

      // Check the knownHash compared to current stored hash
      // Do not allow updates if the user's hash doesn't match the current hash
      var currentHash = db.Hashes.Find(id);
      if (currentHash?.Value != knownHash)
      {
        httpContext.Response.StatusCode = StatusCodes.Status409Conflict;
        return;
      }

      try
      {
        // Move the game to the next phase
        playerRoundInfo.SetBid(bid);

        db.Games.Update(game);
        await UpdateHashAndSaveAsync(db, game);
      }
      catch (Exception ex) when (ex is ArgumentException or InvalidOperationException)
      {
        httpContext.Response.StatusCode = StatusCodes.Status400BadRequest;
      }
    })
    .WithName("SetBid")
    .RequireCors(cors);

    app.MapGet("/games/{id}/setscore", async (string id, int tricksTaken, int bonus, Guid playerId, string knownHash, HttpContext httpContext, SkullKingDbContext db) =>
    {
      var game = await GetFullGame(id, db);
      if (game is null)
      {
        httpContext.Response.StatusCode = StatusCodes.Status404NotFound;
        return;
      }

      var playerRoundInfo = game.PlayerRoundInfo.SingleOrDefault(x => x.Player!.Id == playerId);

      if (playerRoundInfo is null)
      {
        httpContext.Response.StatusCode = StatusCodes.Status401Unauthorized;
        return;
      }

      // Check the knownHash compared to current stored hash
      // Do not allow updates if the user's hash doesn't match the current hash
      var currentHash = db.Hashes.Find(id);
      if (currentHash?.Value != knownHash)
      {
        httpContext.Response.StatusCode = StatusCodes.Status409Conflict;
        return;
      }

      try
      {
        // Set the player's score
        playerRoundInfo.SetScore(tricksTaken, bonus); db.Rounds.AddRange(game.PlayerRoundInfo.Select(x => x.Rounds!.Last()));
        db.Games.Update(game);
        await UpdateHashAndSaveAsync(db, game);
      }
      catch (Exception ex) when (ex is ArgumentException or InvalidOperationException)
      {
        httpContext.Response.StatusCode = StatusCodes.Status400BadRequest;
      }
    })
    .WithName("SetScore")
    .RequireCors(cors);
  }

  private static async Task<Game?> GetFullGame(string id, SkullKingDbContext db)
  {
    var game = await db.Games
      .Include(g => g.PlayerRoundInfo)
         .ThenInclude(info => info.Player)
      .Include(g => g.PlayerRoundInfo)
        .ThenInclude(info => info.Rounds)
      .Where(x => x.Id == id)
      .FirstOrDefaultAsync();

    return game;
  }

  private static async Task UpdateHashAndSaveAsync(SkullKingDbContext db, Game game)
  {
    var gameHash = game.GetHashCode().ToString();
    var existingHash = await db.Hashes.FindAsync(game.Id);
    if (existingHash is not null)
    {
      existingHash.Value = gameHash;
      db.Hashes.Update(existingHash);
    }
    else
    {
      db.Hashes.Add(new Hash { GameId = game.Id, Value = gameHash });
    }

    await db.SaveChangesAsync();
  }
}