namespace skull_king_service.tests;

public class GameTests
{
  [Fact]
  public void CanCreateNewGame()
  {
    var game = Game.Create("Ryan");

    Assert.NotNull(game);
    Assert.True(game.Players.Single() is Player { Name: "Ryan", Id: { } });
    Assert.NotNull(game.Id);
  }

  [Fact]
  public void CanAddPlayerToGame()
  {
    var game = Game.Create("Ryan");
    var controllingPlayer = game.Players.First();

    var newPlayer = new Player("Bob");
    game.AddPlayer(newPlayer);

    Assert.Equal(new List<Player> { controllingPlayer, newPlayer }, game.Players);
  }

  [Fact]
  public void CannotAddExistingPlayerToGame()
  {
    var game = Game.Create("Ryan");
    var controllingPlayer = game.Players.First();

    Assert.Throws<ArgumentException>(() => game.AddPlayer(controllingPlayer));
  }

  [Fact]
  public void CanRemovePlayerFromGame()
  {
    var game = Game.Create("Ryan");
    var controllingPlayer = game.Players.First();
    var newPlayer = new Player("Bob");
    game.AddPlayer(newPlayer);

    game.RemovePlayer(newPlayer);

    Assert.Equal(new List<Player> { controllingPlayer }, game.Players);
  }

  [Fact]
  public void CannotRemoveNonExistentPlayerFromGame()
  {
    var game = Game.Create("Ryan");
    var newPlayer = new Player("Bob");
    game.AddPlayer(newPlayer);

    var nonExistentPlayer = new Player("Bob2");

    Assert.Throws<ArgumentException>(() => game.RemovePlayer(nonExistentPlayer));
  }

  [Fact]
  public void CannotRemoveFirstPlayerFromGame()
  {
    var game = Game.Create("Ryan");
    var controllingPlayer = game.Players.First();
    var newPlayer = new Player("Bob");
    game.AddPlayer(newPlayer);

    Assert.Throws<ArgumentException>(() => game.RemovePlayer(controllingPlayer));
  }
}