namespace skull_king_service.tests;

public class RoundTests
{
  [Fact]
  public void CanCreateValidRound()
  {
    var round = new Round(2);

    Assert.NotNull(round);
    Assert.Equal(2, round.MaxBid);
  }

  [Theory]
  [InlineData(0)]
  [InlineData(-1)]
  [InlineData(11)]
  [InlineData(int.MaxValue)]
  public void CanNotCreateInvalidRound(int invalidMaxBid)
  {
    Assert.Throws<ArgumentException>(() => new Round(invalidMaxBid));
  }

  [Fact]
  public void CanUpdateBid()
  {
    for (int i = 1; i < 11; i++)
    {
      var round = new Round(i);
      var roundId = round.Id;

      for (int j = 0; j <= i; j++)
      {
        round.SetBid(j);

        Assert.NotNull(round);
        Assert.Equal(j, round.Bid);
        Assert.Equal(round.Id, round.Id);
      }
    }
  }

  [Theory]
  [InlineData(5, 7)]
  [InlineData(5, -1)]
  public void ThrowsOnBadBid(int maxBid, int bid)
  {
    var round = new Round(maxBid);

    Assert.Throws<ArgumentException>(() => round.SetBid(bid));
  }

  [Fact]
  public void CanUpdateTricksTaken()
  {
    for (int i = 1; i < 11; i++)
    {
      var round = new Round(i).SetBid(0);
      var roundId = round.Id;

      for (int j = 0; j <= i; j++)
      {
        round.SetTricksTaken(j);

        Assert.NotNull(round);
        Assert.Equal(j, round.TricksTaken);
        Assert.Equal(roundId, round.Id);
      }
    }
  }

  [Theory]
  [InlineData(5, 7)]
  [InlineData(5, -1)]
  public void ThrowsOnBadTricksTaken(int maxBid, int tricksTaken)
  {
    var round = new Round(maxBid).SetBid(5);

    Assert.Throws<ArgumentException>(() => round.SetTricksTaken(tricksTaken));
  }

  [Fact]
  public void ThrowsOnWithTricksTakenNoBid()
  {
    var round = new Round(5);

    Assert.Throws<ArgumentException>(() => round.SetTricksTaken(2));
  }

  [Fact]
  public void CanUpdateBonus()
  {
    var round = new Round(10).SetBid(2).SetTricksTaken(2);
    var roundId = round.Id;

    for (int i = 0; i < 100; i += 10)
    {
      round.SetBonus(i);

      Assert.NotNull(round);
      Assert.Equal(i, round.Bonus);
      Assert.Equal(roundId, round.Id);
    }
  }

  [Theory]
  [InlineData(-1)]
  [InlineData(5)]
  [InlineData(1)]
  [InlineData(9)]
  public void ThrowsOnBadBonus(int bonus)
  {
    var round = new Round(10).SetBid(2).SetTricksTaken(2);

    Assert.Throws<ArgumentException>(() => round.SetBonus(bonus));
  }

  [Fact]
  public void CanSetBonusToZeroWithNoBid()
  {
    var round = new Round(5);
    var roundId = round.Id;

    var updatedRound = round.SetBonus(0);

    Assert.NotNull(round);
    Assert.Equal(0, round.Bonus);
    Assert.Equal(roundId, round.Id);
  }

  [Fact]
  public void ThrowsOnWithBonusNoBid()
  {
    var round = new Round(5);

    Assert.Throws<ArgumentException>(() => round.SetBonus(20));
  }

  [Fact]
  public void NoBonusWhenTakenDoesNotMatchBid()
  {
    var round = new Round(5).SetBid(3).SetTricksTaken(4);

    Assert.Throws<ArgumentException>(() => round.SetBonus(20));
  }

  [Fact]
  public void CanSetBonusToZeroWithNoTricksTaken()
  {
    var round = new Round(5).SetBid(3);
    var roundId = round.Id;

    round.SetBonus(0);

    Assert.NotNull(round);
    Assert.Equal(0, round.Bonus);
    Assert.Equal(roundId, round.Id);
  }

  [Theory]
  [InlineData(1, 0, 0, -10)]
  [InlineData(1, 1, 0, 20)]
  [InlineData(0, 0, 20, 110)]
  [InlineData(0, 1, 0, -90)]
  [InlineData(4, 1, 0, -30)]
  [InlineData(7, 7, 50, 190)]
  public void ScoreIsCorrect(int bid, int tricksTaken, int bonus, int expected)
  {
    var round = new Round(9).SetBid(bid).SetTricksTaken(tricksTaken).SetBonus(bonus);

    Assert.Equal(expected, round.GetScore());
  }

  [Fact]
  public void CanClearBid()
  {
    var round = new Round(5).SetBid(3);
    var roundId = round.Id;
    round.ClearBid();

    Assert.NotNull(round);
    Assert.Null(round.Bid);
    Assert.Equal(5, round.MaxBid);
    Assert.Equal(roundId, round.Id);
  }

  [Fact]
  public void CanClearTricksTaken()
  {
    var round = new Round(5).SetBid(3).SetTricksTaken(2);
    var updatedRound = round.ClearTricksTaken();

    Assert.NotNull(updatedRound);
    Assert.Null(updatedRound.TricksTaken);
    Assert.Equal(3, updatedRound.Bid);
    Assert.Equal(round.Id, updatedRound.Id);
  }

  [Fact]
  public void CanClearBonus()
  {
    var round = new Round(5).SetBid(3).SetTricksTaken(3).SetBonus(20);
    var roundId = round.Id;
    round.ClearBonus();

    Assert.NotNull(round);
    Assert.Null(round.Bonus);
    Assert.Equal(3, round.TricksTaken);
    Assert.Equal(3, round.Bid);
    Assert.Equal(roundId, round.Id);
  }
}