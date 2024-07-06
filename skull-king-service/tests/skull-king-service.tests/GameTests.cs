namespace skull_king_service.tests;

public class GameTests
{
  [Fact]
  public void CanCreateNewGame()
  {
    var game = Game.Create(new Player("Ryan"));

    Assert.NotNull(game);
    Assert.True(game.Players.Single() is Player { Name: "Ryan", Id: { } });
    Assert.NotNull(game.Id);
    Assert.Equal(GameStatus.AcceptingPlayers, game.Status);
  }

  [Fact]
  public void CanAddPlayerToGame()
  {
    var game = Game.Create(new Player("Ryan"));
    var controllingPlayer = game.Players.First();

    var newPlayer = new Player("Bob");
    game.AddPlayer(newPlayer);

    Assert.Equal(new List<Player> { controllingPlayer, newPlayer }, game.Players);
  }

  [Fact]
  public void CannotAddExistingPlayerToGame()
  {
    var game = Game.Create(new Player("Ryan"));
    var controllingPlayer = game.Players.First();

    Assert.Throws<ArgumentException>(() => game.AddPlayer(controllingPlayer));
  }

  [Fact]
  public void CannotAddMoreThanEightPlayersToGame()
  {
    var game = Game.Create(new Player("One"));
    game.AddPlayer(new Player("Two"));
    game.AddPlayer(new Player("Three"));
    game.AddPlayer(new Player("Four"));
    game.AddPlayer(new Player("Five"));
    game.AddPlayer(new Player("Six"));
    game.AddPlayer(new Player("Seven"));
    game.AddPlayer(new Player("Eight"));

    Assert.Throws<ArgumentException>(() => game.AddPlayer(new Player("Nine")));
  }

  [Fact]
  public void CanRemovePlayerFromGame()
  {
    var game = Game.Create(new Player("Ryan"));
    var controllingPlayer = game.Players.First();
    var newPlayer = new Player("Bob");
    game.AddPlayer(newPlayer);

    game.RemovePlayer(newPlayer);

    Assert.Equal(new List<Player> { controllingPlayer }, game.Players);
  }

  [Fact]
  public void CannotRemoveNonExistentPlayerFromGame()
  {
    var game = Game.Create(new Player("Ryan"));
    var newPlayer = new Player("Bob");
    game.AddPlayer(newPlayer);

    var nonExistentPlayer = new Player("Bob2");

    Assert.Throws<ArgumentException>(() => game.RemovePlayer(nonExistentPlayer));
  }

  [Fact]
  public void CannotRemoveFirstPlayerFromGame()
  {
    var game = Game.Create(new Player("Ryan"));
    var controllingPlayer = game.Players.First();
    var newPlayer = new Player("Bob");
    game.AddPlayer(newPlayer);

    Assert.Throws<ArgumentException>(() => game.RemovePlayer(controllingPlayer));
  }

  [Fact]
  public void CanStartGame()
  {
    var game = Game.Create(new Player("Ryan"));
    game.AddPlayer(new Player("Bob"));

    game.StartGame();

    Assert.True(game.RoundInfos.Count == 1);
    Assert.Equal(1, game.RoundInfos.First().PlayerRounds.Select(x => x.Round.MaxBid).Distinct().Single());
    Assert.Equal(GameStatus.BiddingOpen, game.Status);
  }

  [Fact]
  public void CannotStartGameWithOnePlayer()
  {
    var game = Game.Create(new Player("Ryan"));

    Assert.Throws<InvalidOperationException>(() => game.StartGame());
  }

  [Fact]
  public void GameHashesAreNotEqual()
  {
    var player = new Player("Ryan");
    var game = Game.Create(player);
    var originalHashCode = game.GetHashCode();

    game.AddPlayer(new Player("Bob"));

    Assert.NotEqual(originalHashCode, game.GetHashCode());
  }
}