namespace skull_king_service.tests;

public class PlayerRoundTests
{
  [Fact]
  public void CanCreateValidPlayerRound()
  {
    var player = new Player("Ryan");
    var round = new Round(2);
    var playerRound = PlayerRound.Create(player, round);

    Assert.NotNull(playerRound);
    Assert.Equal(player, playerRound.Player);
    Assert.Equal(round, playerRound.Round);
  }
}