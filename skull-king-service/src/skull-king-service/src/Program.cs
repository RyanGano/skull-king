using Microsoft.EntityFrameworkCore;
using Microsoft.VisualBasic;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContext<SkullKingDbContext>(options =>
    options.UseInMemoryDatabase("SkullKingInMemoryDb"));

var app = builder.Build();

app.MapGet("/", (string? name, string? gameId, SkullKingDbContext db) =>
{
  if (name is not null)
  {
    var player = new Player(name ?? "[unknown]");
    var game = Game.Create(player);
    db.Games.Add(game);
    db.Players.Add(player);
    db.SaveChanges();

    var playerCount = db.Games.Find(game.Id)?.Players.Count;

    return $"Starting game '{game.Id}' - {playerCount}";
  }
  if (gameId is not null)
  {
    var game = db.Games.Include(g => g.Players).Where(x => x.Id == gameId).FirstOrDefault();
    if (game is null)
      return $"Game '{gameId}' not found";

    var newPlayer = new Player("Player 2");
    game.AddPlayer(newPlayer);
    db.Games.Update(game);
    db.Players.Add(newPlayer);
    db.SaveChanges();

    var newPlayerCount = db.Games.Find(game.Id)?.Players.Count;

    return $"Starting game '{game.Id}' - {newPlayerCount}";
  }

  return "nothing here";
});

app.Run();
