namespace skull_king_service.tests;

public class PlayerRoundsTests
{
  [Fact]
  public void CanCreateValidPlayerRound()
  {
    var player = new Player("Ryan");
    var playerRounds = PlayerRounds.Create(player);
    playerRounds.AddRound();

    Assert.NotNull(playerRounds);
    Assert.Equal(player, playerRounds.Player);
    Assert.Equal(1, playerRounds.Rounds?.Single().MaxBid);
  }

  [Fact]
  public void CanSetBid()
  {
    var player = new Player("Ryan");
    var playerRounds = PlayerRounds.Create(player);
    playerRounds.AddRound();

    playerRounds.SetBid(1);

    Assert.Equal(1, playerRounds.Rounds?.Single().Bid);
  }

  [Fact]
  public void CanClearBid()
  {
    var player = new Player("Ryan");
    var playerRounds = PlayerRounds.Create(player);
    playerRounds.AddRound();

    playerRounds.ClearBid();

    Assert.Null(playerRounds.Rounds?.Single().Bid);
  }

  [Fact]
  public void CanSetScore()
  {
    var player = new Player("Ryan");
    var playerRounds = PlayerRounds.Create(player);
    playerRounds.AddRound();

    playerRounds.SetBid(1);
    playerRounds.SetScore(1, 20);

    Assert.Equal(1, playerRounds.Rounds?.Single().TricksTaken);
    Assert.Equal(20, playerRounds.Rounds?.Single().Bonus);
  }

  [Fact]
  public void CanClearScore()
  {
    var player = new Player("Ryan");
    var playerRounds = PlayerRounds.Create(player);
    playerRounds.AddRound();

    playerRounds.SetBid(1);
    playerRounds.SetScore(1, 20);
    playerRounds.ClearScore();

    Assert.Null(playerRounds.Rounds?.Single().TricksTaken);
    Assert.Null(playerRounds.Rounds?.Single().Bonus);
  }

  [Fact]
  public void CanRemoveLastRound()
  {
    var player = new Player("Ryan");
    var playerRounds = PlayerRounds.Create(player);
    playerRounds.AddRound();

    playerRounds.SetBid(1);
    playerRounds.SetScore(1, 10);
    playerRounds.AddRound();
    playerRounds.SetBid(2);
    playerRounds.SetScore(1, 0);

    playerRounds.RemoveLastRound();

    Assert.Equal(1, playerRounds.Rounds?.Count);
    Assert.Equal(1, playerRounds.Rounds![0].Bid);
    Assert.Equal(1, playerRounds.Rounds![0].TricksTaken);
    Assert.Equal(10, playerRounds.Rounds![0].Bonus);
  }

  [Fact]
  public void CannotRemoveFirstRound()
  {
    var player = new Player("Ryan");
    var playerRounds = PlayerRounds.Create(player);
    playerRounds.AddRound();

    playerRounds.SetBid(1);
    playerRounds.SetScore(1, 10);

    Assert.Throws<InvalidOperationException>(() => playerRounds.RemoveLastRound());
  }
}