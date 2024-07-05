namespace skull_king_service.tests;

public class GameTests
{
  [Fact]
  public void CanCreateNewGame()
  {
    var game = Game.Create("Ryan");

    Assert.NotNull(game);
    Assert.Equal(new List<string> { "Ryan" }, game.Players);
    Assert.NotNull(game.Id);
  }

  [Fact]
  public void CanAddPlayerToGame()
  {
    var game = Game.Create("Ryan");

    game.AddPlayer("Bob");

    Assert.Equal(new List<string> { "Ryan", "Bob" }, game.Players);
  }

  [Fact]
  public void CannotAddExistingPlayerToGame()
  {
    var game = Game.Create("Ryan");

    Assert.Throws<ArgumentException>(() => game.AddPlayer("Ryan"));
  }

  [Fact]
  public void CanRemovePlayerFromGame()
  {
    var game = Game.Create("Ryan");
    game.AddPlayer("Bob");

    game.RemovePlayer("Bob");

    Assert.Equal(new List<string> { "Ryan" }, game.Players);
  }

  [Fact]
  public void CannotRemoveNonExistentPlayerFromGame()
  {
    var game = Game.Create("Ryan");
    game.AddPlayer("Bob");

    Assert.Throws<ArgumentException>(() => game.RemovePlayer("Bob2"));
  }

  [Fact]
  public void CannotRemoveFirstPlayerFromGame()
  {
    var game = Game.Create("Ryan");
    game.AddPlayer("Bob");

    Assert.Throws<ArgumentException>(() => game.RemovePlayer("Ryan"));
  }
}