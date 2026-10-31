using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

public static class GameRoutes
{
  // Game actions are authorized by the acting player's secret token, sent in
  // this header. A player's public Id (visible to anyone who can read the
  // game) is never enough on its own.
  public const string PlayerTokenHeader = "X-Player-Token";

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
      // Set expansion flag from DTO (use internal method if available)
      var expansionProp = game.GetType().GetProperty("ExpansionEnabled");
      if (expansionProp is not null)
      {
        expansionProp.SetValue(game, gameInfo.ExpansionEnabled);
      }
      db.Players.Add(game.PlayerRoundInfo.Single().Player!);
      db.Rounds.AddRange(game.PlayerRoundInfo.SelectMany(x => x.Rounds!));
      db.PlayerRoundInfos.Add(game.PlayerRoundInfo.Single());
      db.Games.Add(game);
      var newGameHash = await UpdateHashAndSaveAsync(db, game);
      await db.SaveChangesAsync();

      httpContext.Response.StatusCode = 201;
      var captain = game.PlayerRoundInfo.Single().Player!;
      await httpContext.Response.WriteAsJsonAsync(new CreatedGameDto(game.MapToDto(newGameHash), captain.Token));
    })
    .WithName("CreateGame")
    .RequireRateLimiting(RateLimits.GameCreate)
    .RequireCors(cors);

    app.MapGet("/games/{id}", async (GameId id, HttpContext httpContext, SkullKingDbContext db, string? knownHash = null) =>
    {
      var storedHash = db.Hashes.Find(id.Value);
      if (knownHash is not null && storedHash?.Value == knownHash)
      {
        httpContext.Response.StatusCode = StatusCodes.Status304NotModified;
        return;
      }

      var game = await GetFullGame(id, db);
      if (game is null)
      {
        httpContext.Response.StatusCode = StatusCodes.Status404NotFound;
        return;
      }

      await httpContext.Response.WriteAsJsonAsync(game.MapToDto(storedHash?.Value));
    })
    .WithName("GetGame")
    .RequireRateLimiting(RateLimits.GameRead)
    .RequireCors(cors);

    app.MapPut("/games/{id}/players", async (GameId id, PlayerDto player, [FromHeader(Name = PlayerTokenHeader)] string? playerToken, HttpContext httpContext, SkullKingDbContext db) =>
    {
      var game = await GetFullGame(id, db);
      if (game is null)
      {
        httpContext.Response.StatusCode = StatusCodes.Status404NotFound;
        return;
      }

      try
      {
        var existingPlayer = game.PlayerRoundInfo
          .Select(x => x.Player!)
          .FirstOrDefault(x => x.Id == player.Id);

        if (existingPlayer is not null)
        {
          // Renaming: only the player themselves or the captain
          var requestingPlayer = FindRequestingPlayer(game, playerToken);
          if (requestingPlayer is null || (requestingPlayer.Id != existingPlayer.Id && !IsCaptain(game, requestingPlayer)))
          {
            httpContext.Response.StatusCode = StatusCodes.Status401Unauthorized;
            return;
          }

          existingPlayer.ChangeName(player.Name!);
          db.Players.Update(existingPlayer);
          db.Games.Update(game);
          await UpdateHashAndSaveAsync(db, game);

          await httpContext.Response.WriteAsJsonAsync(existingPlayer.MapToDto());
          return;
        }

        // Joining: the new player's token is returned to this caller only
        var newPlayer = new Player(player.Name!);
        var newPlayerRounds = game.AddPlayer(newPlayer);
        db.Players.Add(newPlayerRounds.Player!);
        db.Rounds.AddRange(newPlayerRounds.Rounds);
        db.PlayerRoundInfos.Add(newPlayerRounds);

        db.Games.Update(game);
        await UpdateHashAndSaveAsync(db, game);

        await httpContext.Response.WriteAsJsonAsync(new JoinedPlayerDto(newPlayer.MapToDto(), newPlayer.Token));
      }
      catch (ArgumentException)
      {
        httpContext.Response.StatusCode = StatusCodes.Status400BadRequest;
      }
    })
    .WithName("AddPlayerToGame")
    .RequireRateLimiting(RateLimits.GameJoin)
    .RequireCors(cors);

    app.MapDelete("/games/{id}/players/{playerId}", async (GameId id, Guid playerId, string knownHash, [FromHeader(Name = PlayerTokenHeader)] string? playerToken, HttpContext httpContext, SkullKingDbContext db) =>
    {
      // Check the knownHash compared to current stored hash
      // Do not allow updates if the user's hash doesn't match the current hash
      var currentHash = db.Hashes.Find(id.Value);
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

      // Allow only the player removing themselves, or the captain removing another player
      var requestingPlayer = FindRequestingPlayer(game, playerToken);
      if (requestingPlayer is null || (requestingPlayer.Id != playerId && !IsCaptain(game, requestingPlayer)))
      {
        httpContext.Response.StatusCode = StatusCodes.Status401Unauthorized;
        return;
      }

      var playerToRemove = game.PlayerRoundInfo.FirstOrDefault(pri => pri.Player!.Id == playerId)?.Player;
      if (playerToRemove is null)
      {
        httpContext.Response.StatusCode = StatusCodes.Status404NotFound;
        return;
      }

      try
      {
        var playerRoundToRemove = game.PlayerRoundInfo.First(pri => pri.Player!.Id == playerId);
        game.RemovePlayer(playerToRemove);

        if (game.PlayerRoundInfo.Count < 2 && game.Status != GameStatus.AcceptingPlayers)
        {
          // Delete the game and all related entities only if game is in progress or completed
          foreach (var playerRound in game.PlayerRoundInfo)
          {
            db.Rounds.RemoveRange(playerRound.Rounds!);
            db.PlayerRoundInfos.Remove(playerRound);
            db.Players.Remove(playerRound.Player!);
          }
          // Also remove the removed player's entities
          db.Rounds.RemoveRange(playerRoundToRemove.Rounds!);
          db.PlayerRoundInfos.Remove(playerRoundToRemove);
          db.Players.Remove(playerToRemove);
          db.Games.Remove(game);
          if (currentHash is not null)
          {
            db.Hashes.Remove(currentHash);
          }
        }
        else
        {
          // Remove the player and their rounds, but keep the game if it's still accepting players
          db.Rounds.RemoveRange(playerRoundToRemove.Rounds!);
          db.PlayerRoundInfos.Remove(playerRoundToRemove);
          db.Players.Remove(playerToRemove);

          db.Games.Update(game);
          await UpdateHashAndSaveAsync(db, game);
        }

        await db.SaveChangesAsync();
      }
      catch (ArgumentException)
      {
        httpContext.Response.StatusCode = StatusCodes.Status400BadRequest;
      }
    })
    .WithName("RemovePlayerFromGame")
    .RequireCors(cors);

    app.MapPost("/games/{id}/start", async (GameId id, string knownHash, [FromHeader(Name = PlayerTokenHeader)] string? playerToken, bool? randomBidMode, GameDifficulty? gameDifficulty, HttpContext httpContext, SkullKingDbContext db) =>
    {
      // Check the knownHash compared to current stored hash
      // Do not allow updates if the user's hash doesn't match the current hash
      var currentHash = db.Hashes.Find(id.Value);
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

      if (!IsCaptain(game, FindRequestingPlayer(game, playerToken)))
      {
        httpContext.Response.StatusCode = StatusCodes.Status401Unauthorized;
        return;
      }

      try
      {
        var playerCount = game.PlayerRoundInfo.Count;
        game.StartGame(randomBidMode ?? false, gameDifficulty ?? GameDifficulty.Easy);

        PlayerRounds? addedPlayerRound = null;
        Round? addedRound = null;

        if (game.PlayerRoundInfo.Count != playerCount)
        {
          addedPlayerRound = game.PlayerRoundInfo.Skip(playerCount).First();
          db.Players.Add(addedPlayerRound.Player!);
          addedRound = addedPlayerRound.Rounds!.Last();
          db.Rounds.Add(addedRound);
          db.PlayerRoundInfos.Add(addedPlayerRound);
        }

        db.Rounds.AddRange(game.PlayerRoundInfo.Select(x => x.Rounds!.Last()).Where(x => x != addedRound));
        db.PlayerRoundInfos.UpdateRange(game.PlayerRoundInfo.Where(x => x != addedPlayerRound));
        db.Games.Update(game);
        var startedGameHash = await UpdateHashAndSaveAsync(db, game);

        await httpContext.Response.WriteAsJsonAsync(game.MapToDto(startedGameHash));
      }
      catch (Exception ex) when (ex is ArgumentException or InvalidOperationException)
      {
        httpContext.Response.StatusCode = StatusCodes.Status400BadRequest;
      }
    })
    .WithName("StartGame")
    .RequireCors(cors);

    app.MapPost("/games/{id}/reset", async (GameId id, string knownHash, [FromHeader(Name = PlayerTokenHeader)] string? playerToken, HttpContext httpContext, SkullKingDbContext db) =>
    {
      // Check the knownHash compared to current stored hash
      // Do not allow updates if the user's hash doesn't match the current hash
      var currentHash = db.Hashes.Find(id.Value);
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

      if (!IsCaptain(game, FindRequestingPlayer(game, playerToken)))
      {
        httpContext.Response.StatusCode = StatusCodes.Status401Unauthorized;
        return;
      }

      if (game.Status != GameStatus.GameOver)
      {
        httpContext.Response.StatusCode = StatusCodes.Status400BadRequest;
        return;
      }

      try
      {
        // Move the game to the beginning phase
        while (!(game.PlayerRoundInfo[0].Rounds.Count == 1 && game.Status == GameStatus.BiddingOpen))
        {
          foreach (var round in game.MoveToPreviousPhase().Where(round => round is not null))
            db.Rounds.Remove(round!);
        }

        foreach (var playerRoundInfo in game.PlayerRoundInfo)
          playerRoundInfo.ClearBid();

        if (game.IsRandomBid)
        {
          foreach (var round in game.MoveToNextPhase().Where(round => round is not null))
            db.Rounds.Add(round!);
        }

        db.Games.Update(game);
        await UpdateHashAndSaveAsync(db, game);
      }
      catch (Exception ex) when (ex is ArgumentException or InvalidOperationException)
      {
        httpContext.Response.StatusCode = StatusCodes.Status400BadRequest;
      }
    })
    .WithName("ResetGame")
    .RequireCors(cors);


    app.MapPut("/games/{id}/players/reorder", async (GameId id, PlayerOrderDto playerOrderDto, [FromHeader(Name = PlayerTokenHeader)] string? playerToken, HttpContext httpContext, SkullKingDbContext db) =>
    {
      // Check the knownHash compared to current stored hash
      // Do not allow updates if the user's hash doesn't match the current hash
      var currentHash = db.Hashes.Find(id.Value);
      if (currentHash?.Value != playerOrderDto.KnownHash)
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

      if (!IsCaptain(game, FindRequestingPlayer(game, playerToken)))
      {
        httpContext.Response.StatusCode = StatusCodes.Status401Unauthorized;
        return;
      }

      try
      {
        game.SetPlayerOrder(playerOrderDto.PlayerOrder);
        db.Games.Update(game);
        await UpdateHashAndSaveAsync(db, game);
      }
      catch (Exception ex) when (ex is ArgumentException or InvalidOperationException)
      {
        httpContext.Response.StatusCode = StatusCodes.Status400BadRequest;
      }
    })
    .WithName("ReorderPlayers")
    .RequireCors(cors);

    app.MapPost("/games/{id}/movenext", async (GameId id, string knownHash, [FromHeader(Name = PlayerTokenHeader)] string? playerToken, HttpContext httpContext, SkullKingDbContext db, ILoggerFactory loggerFactory) =>
    {
      var logger = loggerFactory.CreateLogger("GameRoutes");
      var game = await GetFullGame(id, db, logger);
      if (game is null)
      {
        httpContext.Response.StatusCode = StatusCodes.Status404NotFound;
        return;
      }

      if (!IsCaptain(game, FindRequestingPlayer(game, playerToken)))
      {
        httpContext.Response.StatusCode = StatusCodes.Status401Unauthorized;
        return;
      }

      // Check the knownHash compared to current stored hash
      // Do not allow updates if the user's hash doesn't match the current hash
      var currentHash = db.Hashes.Find(id.Value);
      if (currentHash?.Value != knownHash)
      {
        LogStaleHash(logger, httpContext, id, knownHash, currentHash?.Value, game);
        httpContext.Response.StatusCode = StatusCodes.Status409Conflict;
        return;
      }

      try
      {
        // Move the game to the next phase
        foreach (var round in game.MoveToNextPhase().Where(round => round is not null))
          db.Rounds.Add(round!);

        db.Games.Update(game);
        await UpdateHashAndSaveAsync(db, game);
      }
      catch (Exception ex) when (ex is ArgumentException or InvalidOperationException)
      {
        LogRejectedChange(logger, ex, "movenext", id, game);
        httpContext.Response.StatusCode = StatusCodes.Status400BadRequest;
      }
    })
    .WithName("MoveToNextPhase")
    .RequireCors(cors);

    app.MapPost("/games/{id}/moveprevious", async (GameId id, string knownHash, [FromHeader(Name = PlayerTokenHeader)] string? playerToken, HttpContext httpContext, SkullKingDbContext db, ILoggerFactory loggerFactory) =>
    {
      var logger = loggerFactory.CreateLogger("GameRoutes");
      var game = await GetFullGame(id, db, logger);
      if (game is null)
      {
        httpContext.Response.StatusCode = StatusCodes.Status404NotFound;
        return;
      }

      if (!IsCaptain(game, FindRequestingPlayer(game, playerToken)))
      {
        httpContext.Response.StatusCode = StatusCodes.Status401Unauthorized;
        return;
      }

      // Check the knownHash compared to current stored hash
      // Do not allow updates if the user's hash doesn't match the current hash
      var currentHash = db.Hashes.Find(id.Value);
      if (currentHash?.Value != knownHash)
      {
        LogStaleHash(logger, httpContext, id, knownHash, currentHash?.Value, game);
        httpContext.Response.StatusCode = StatusCodes.Status409Conflict;
        return;
      }

      try
      {
        // Move the game to the previous phase
        foreach (var round in game.MoveToPreviousPhase().Where(round => round is not null))
          db.Rounds.Remove(round!);

        db.Games.Update(game);
        await UpdateHashAndSaveAsync(db, game);
      }
      catch (Exception ex) when (ex is ArgumentException or InvalidOperationException)
      {
        LogRejectedChange(logger, ex, "moveprevious", id, game);
        httpContext.Response.StatusCode = StatusCodes.Status400BadRequest;
      }
    })
    .WithName("MoveToPreviousPhase")
    .RequireCors(cors);

    app.MapPost("/games/{id}/setbid", async (GameId id, int bid, Guid playerId, string knownHash, [FromHeader(Name = PlayerTokenHeader)] string? playerToken, HttpContext httpContext, SkullKingDbContext db, ILoggerFactory loggerFactory) =>
    {
      var logger = loggerFactory.CreateLogger("GameRoutes");
      var game = await GetFullGame(id, db, logger);
      if (game is null)
      {
        httpContext.Response.StatusCode = StatusCodes.Status404NotFound;
        return;
      }

      // A player sets their own bid and score; the captain may set anyone's
      var requestingPlayer = FindRequestingPlayer(game, playerToken);
      if (requestingPlayer is null || (requestingPlayer.Id != playerId && !IsCaptain(game, requestingPlayer)))
      {
        httpContext.Response.StatusCode = StatusCodes.Status401Unauthorized;
        return;
      }

      var playerRoundInfo = game.PlayerRoundInfo.SingleOrDefault(x => x.Player!.Id == playerId);
      if (playerRoundInfo is null)
      {
        httpContext.Response.StatusCode = StatusCodes.Status404NotFound;
        return;
      }

      // Check the knownHash compared to current stored hash
      // Do not allow updates if the user's hash doesn't match the current hash
      var currentHash = db.Hashes.Find(id.Value);
      if (currentHash?.Value != knownHash)
      {
        LogStaleHash(logger, httpContext, id, knownHash, currentHash?.Value, game);
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
        LogRejectedChange(logger, ex, "setbid", id, game);
        httpContext.Response.StatusCode = StatusCodes.Status400BadRequest;
      }
    })
    .WithName("SetBid")
    .RequireCors(cors);

    app.MapPost("/games/{id}/setscore", async (GameId id, int tricksTaken, int bonus, Guid playerId, string knownHash, [FromHeader(Name = PlayerTokenHeader)] string? playerToken, HttpContext httpContext, SkullKingDbContext db, ILoggerFactory loggerFactory) =>
    {
      var logger = loggerFactory.CreateLogger("GameRoutes");
      var game = await GetFullGame(id, db, logger);
      if (game is null)
      {
        httpContext.Response.StatusCode = StatusCodes.Status404NotFound;
        return;
      }

      // A player sets their own bid and score; the captain may set anyone's
      var requestingPlayer = FindRequestingPlayer(game, playerToken);
      if (requestingPlayer is null || (requestingPlayer.Id != playerId && !IsCaptain(game, requestingPlayer)))
      {
        httpContext.Response.StatusCode = StatusCodes.Status401Unauthorized;
        return;
      }

      var playerRoundInfo = game.PlayerRoundInfo.SingleOrDefault(x => x.Player!.Id == playerId);
      if (playerRoundInfo is null)
      {
        httpContext.Response.StatusCode = StatusCodes.Status404NotFound;
        return;
      }

      // Check the knownHash compared to current stored hash
      // Do not allow updates if the user's hash doesn't match the current hash
      var currentHash = db.Hashes.Find(id.Value);
      if (currentHash?.Value != knownHash)
      {
        LogStaleHash(logger, httpContext, id, knownHash, currentHash?.Value, game);
        httpContext.Response.StatusCode = StatusCodes.Status409Conflict;
        return;
      }

      try
      {
        // Set the player's score
        playerRoundInfo.SetScore(tricksTaken, bonus);
        db.Games.Update(game);
        await UpdateHashAndSaveAsync(db, game);
      }
      catch (Exception ex) when (ex is ArgumentException or InvalidOperationException)
      {
        LogRejectedChange(logger, ex, "setscore", id, game);
        httpContext.Response.StatusCode = StatusCodes.Status400BadRequest;
      }
    })
    .WithName("SetScore")
    .RequireCors(cors);

    app.MapGet("/games/getid", async (HttpContext httpContext, SkullKingDbContext db) =>
    {
      if (db.Games.Count() != 1)
      {
        httpContext.Response.StatusCode = StatusCodes.Status204NoContent;
        return;
      }

      await httpContext.Response.WriteAsync(db.Games.First().Id);
    })
    .WithName("GetSingleGameId")
    .RequireRateLimiting(RateLimits.GameRead)
    .RequireCors(cors);
  }

  private static Player? FindRequestingPlayer(Game game, string? playerToken)
  {
    if (string.IsNullOrEmpty(playerToken))
      return null;

    return game.PlayerRoundInfo
      .Select(x => x.Player!)
      .FirstOrDefault(x => x.HasToken(playerToken));
  }

  // The captain is the first seat. GetFullGame restores seat order after loading
  // (SortPlayersAndRounds), so this holds however the store returns the rows.
  private static bool IsCaptain(Game game, Player? player)
  {
    return player is not null && game.PlayerRoundInfo.First().Player!.Id == player.Id;
  }

  private static async Task<Game?> GetFullGame(GameId gameId, SkullKingDbContext db, ILogger? logger = null)
  {
    // Normalize the GameId so users who typed O or I 
    // instead of 0 or 1 can still get the game
    // GameId gameId = new GameId(id);

    var game = await db.Games
      .Include(g => g.PlayerRoundInfo)
         .ThenInclude(info => info.Player)
      .Include(g => g.PlayerRoundInfo)
        .ThenInclude(info => info.Rounds)
      .Where(x => x.Id == gameId.Value)
      .FirstOrDefaultAsync();

    // The database does not preserve the order rows were written in, so restore
    // seating and round order before anything reads them positionally.
    if (game?.SortPlayersAndRounds() == true)
    {
      logger?.LogInformation(
        "Game {GameId} came back from the database out of order and was resorted.",
        gameId.Value);
    }

    return game;
  }

  // A caller whose hash never matches can never change anything again, so make
  // that visible rather than letting it look like an ordinary retry.
  private static void LogStaleHash(ILogger logger, HttpContext httpContext, GameId id, string knownHash, string? currentHash, Game game)
  {
    logger.LogWarning(
      "Rejected {Route} for game {GameId} as out of date: caller had {KnownHash}, stored is {CurrentHash}. Game is {Status} on round {Round}.",
      httpContext.Request.Path, id.Value, knownHash, currentHash ?? "(none)",
      game.Status, game.PlayerRoundInfo.FirstOrDefault()?.Rounds?.Count);
  }

  // A rejected change is where a game gets wedged, and the caller only sees a
  // bare 400. Write down enough of the game to work out why afterwards.
  private static void LogRejectedChange(ILogger logger, Exception ex, string change, GameId id, Game game)
  {
    var rounds = string.Join(" | ", game.PlayerRoundInfo.Select(playerRounds =>
      $"{playerRounds.Player?.Name}: " + string.Join(",", playerRounds.Rounds!.Select(round =>
        $"r{round.Number}(max {round.MaxBid}, bid {round.Bid?.ToString() ?? "-"}, took {round.TricksTaken?.ToString() ?? "-"}, bonus {round.Bonus?.ToString() ?? "-"})"))));

    logger.LogError(ex,
      "Rejected {Change} for game {GameId}. Game is {Status} with {PlayerCount} players. Rounds: {Rounds}",
      change, id.Value, game.Status, game.PlayerRoundInfo.Count, rounds);
  }

  private static async Task<string> UpdateHashAndSaveAsync(SkullKingDbContext db, Game game)
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

    return gameHash;
  }
}
