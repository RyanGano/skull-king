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
        : new GameId();

      var existingGame = await db.Games.Where(x => x.Id == gameId.Value).FirstOrDefaultAsync();
      if (existingGame is not null)
      {
        httpContext.Response.StatusCode = StatusCodes.Status409Conflict;
        return;
      }

      var game = Game.Create(gameId, new Player(gameInfo.PlayerName));
      db.Games.Add(game);
      await db.SaveChangesAsync();

      httpContext.Response.StatusCode = 201;
      await httpContext.Response.WriteAsJsonAsync(game.MapToDto());
    })
    .WithName("CreateGame")
    .RequireCors(cors);

    app.MapGet("/games/{id}", async (string id, HttpContext httpContext, SkullKingDbContext db) =>
    {
      var game = await db.Games
        .Include(game => game.Players)
        .Include(game => game.RoundInfos)
          .ThenInclude(roundinfo => roundinfo.PlayerRounds)!
          .ThenInclude(playerRound => playerRound.Round)
        .Where(x => x.Id == id)
        .FirstOrDefaultAsync();
      if (game is null)
      {
        httpContext.Response.StatusCode = StatusCodes.Status404NotFound;
        return;
      }

      await httpContext.Response.WriteAsJsonAsync(game);
    })
    .WithName("GetGame")
    .RequireCors(cors);

    app.MapPut("/games/{id}/players", async (string id, PlayerDto player, HttpContext httpContext, SkullKingDbContext db) =>
    {
      var game = await db.Games.Include(g => g.Players).Include(g => g.RoundInfos).Where(x => x.Id == id).FirstOrDefaultAsync();
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
        db.SaveChanges();

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
      var game = await db.Games.Include(g => g.Players).Include(g => g.RoundInfos).Where(x => x.Id == id).FirstOrDefaultAsync();
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
        db.SaveChanges();

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
}