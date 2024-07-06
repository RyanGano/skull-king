namespace skull_king_service.tests;

public class RoundInfoTests
{
  [Fact]
  public void CanCreateRoundInfo()
  {
    var playerOne = new Player("Ryan");
    var playerTwo = new Player("Bob");
    var players = new List<Player> { playerOne, playerTwo };

    var roundInfo = new RoundInfo(players, 1);

    Assert.NotNull(roundInfo);
    Assert.Equal(2, roundInfo.PlayerRounds.Count);
    Assert.Equal(players, roundInfo.PlayerRounds.Select(pr => pr.Player).ToList());
    Assert.Equal(1, roundInfo.PlayerRounds.Select(pr => pr.Round.MaxBid).Distinct().Single());
  }

  [Fact]
  public void CanEditRoundInfo()
  {
    var playerOne = new Player("Ryan");
    var playerTwo = new Player("Bob");
    var players = new List<Player> { playerOne, playerTwo };

    var roundInfo = new RoundInfo(players, 1);

    var playerOneRound = roundInfo.PlayerRounds.First();
    var updatedPlayerRound = new PlayerRound(playerOneRound.Player, playerOneRound.Round.WithBid(1));

    var newRoundInfo = new RoundInfo(roundInfo, updatedPlayerRound);

    Assert.Equal(2, newRoundInfo.PlayerRounds.Count);
    Assert.Equal(players, newRoundInfo.PlayerRounds.Select(pr => pr.Player).ToList());
    Assert.Equal(1, newRoundInfo.PlayerRounds.First().Round.Bid);
    Assert.Null(newRoundInfo.PlayerRounds.Last().Round.Bid);
  }
}