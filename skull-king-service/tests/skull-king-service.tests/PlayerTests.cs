namespace skull_king_service.tests;

public class PlayerTests
{
  [Fact]
  public void CanCreatePlayer()
  {
    var player = new Player("Ryan");

    Assert.NotNull(player);
    Assert.Equal("Ryan", player.Name);
  }

  [Fact]
  public void CanChangePlayerName()
  {
    var player = new Player("Ryan");

    var originalId = player.Id;
    player.ChangeName("Bob");

    Assert.Equal("Bob", player.Name);
    Assert.Equal(originalId, player.Id);
  }

  [Fact]
  public void PlayerHashesAreEqual()
  {
    var playerOne = new Player("Ryan");

    Assert.Equal(playerOne.GetHashCode(), playerOne.GetHashCode());
  }

  [Theory]
  [InlineData("Ryan", "Ryan")]
  [InlineData("Ryan", "Bob")]
  public void PlayerHashesAreNotEqual(string nameOne, string nameTwo)
  {
    var playerOne = new Player(nameOne);
    var playerTwo = new Player(nameTwo);

    Assert.NotEqual(playerOne.GetHashCode(), playerTwo.GetHashCode());
  }
}