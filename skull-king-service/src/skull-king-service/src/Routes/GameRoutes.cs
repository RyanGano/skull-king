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
      var game = await db.Games.Include(g => g.Players).Include(g => g.RoundInfos).Where(x => x.Id == id).FirstOrDefaultAsync();
      if (game is null)
      {
        httpContext.Response.StatusCode = 404;
        return;
      }

      await httpContext.Response.WriteAsJsonAsync(game);
    })
    .WithName("GetSigninInfo")
    .RequireCors(cors);
  }
}