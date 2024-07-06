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

      for (int j = 0; j <= i; j++)
      {
        var updatedRound = round.WithBid(j);

        Assert.NotNull(updatedRound);
        Assert.Equal(j, updatedRound.Bid);
        Assert.Equal(round.Id, updatedRound.Id);
      }
    }
  }

  [Theory]
  [InlineData(5, 7)]
  [InlineData(5, -1)]
  public void ThrowsOnBadBid(int maxBid, int bid)
  {
    var round = new Round(maxBid);

    Assert.Throws<ArgumentException>(() => round.WithBid(bid));
  }

  [Fact]
  public void CanUpdateTricksTaken()
  {
    for (int i = 1; i < 11; i++)
    {
      var round = new Round(i).WithBid(0);

      for (int j = 0; j <= i; j++)
      {
        var updatedRound = round.WithTricksTaken(j);

        Assert.NotNull(updatedRound);
        Assert.Equal(j, updatedRound.TricksTaken);
        Assert.Equal(round.Id, updatedRound.Id);
      }
    }
  }

  [Theory]
  [InlineData(5, 7)]
  [InlineData(5, -1)]
  public void ThrowsOnBadTricksTaken(int maxBid, int tricksTaken)
  {
    var round = new Round(maxBid).WithBid(5);

    Assert.Throws<ArgumentException>(() => round.WithTricksTaken(tricksTaken));
  }

  [Fact]
  public void ThrowsOnWithTricksTakenNoBid()
  {
    var round = new Round(5);

    Assert.Throws<ArgumentException>(() => round.WithTricksTaken(2));
  }

  [Fact]
  public void CanUpdateBonus()
  {
    var round = new Round(10).WithBid(2).WithTricksTaken(2);
    for (int i = 0; i < 100; i += 10)
    {
      var updatedRound = round.WithBonus(i);

      Assert.NotNull(updatedRound);
      Assert.Equal(i, updatedRound.Bonus);
      Assert.Equal(round.Id, updatedRound.Id);
    }
  }

  [Theory]
  [InlineData(-1)]
  [InlineData(5)]
  [InlineData(1)]
  [InlineData(9)]
  public void ThrowsOnBadBonus(int bonus)
  {
    var round = new Round(10).WithBid(2).WithTricksTaken(2);

    Assert.Throws<ArgumentException>(() => round.WithBonus(bonus));
  }

  [Fact]
  public void CanSetBonusToZeroWithNoBid()
  {
    var round = new Round(5);

    var updatedRound = round.WithBonus(0);

    Assert.NotNull(updatedRound);
    Assert.Equal(0, updatedRound.Bonus);
    Assert.Equal(round.Id, updatedRound.Id);
  }

  [Fact]
  public void ThrowsOnWithBonusNoBid()
  {
    var round = new Round(5);

    Assert.Throws<ArgumentException>(() => round.WithBonus(20));
  }

  [Fact]
  public void NoBonusWhenTakenDoesNotMatchBid()
  {
    var round = new Round(5).WithBid(3).WithTricksTaken(4);

    Assert.Throws<ArgumentException>(() => round.WithBonus(20));
  }

  [Fact]
  public void CanSetBonusToZeroWithNoTricksTaken()
  {
    var round = new Round(5).WithBid(3); ;

    var updatedRound = round.WithBonus(0);

    Assert.NotNull(updatedRound);
    Assert.Equal(0, updatedRound.Bonus);
    Assert.Equal(round.Id, updatedRound.Id);
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
    var round = new Round(9).WithBid(bid).WithTricksTaken(tricksTaken).WithBonus(bonus);

    Assert.Equal(expected, round.GetScore());
  }
}