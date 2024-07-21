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
}