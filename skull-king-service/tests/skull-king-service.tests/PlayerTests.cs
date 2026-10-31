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

  [Fact]
  public void EachPlayerHasTheirOwnToken()
  {
    var playerOne = new Player("Ryan");
    var playerTwo = new Player("Bob");

    Assert.Matches("^[0-9A-F]{32}$", playerOne.Token);
    Assert.NotEqual(playerOne.Token, playerTwo.Token);
  }

  [Fact]
  public void HasTokenMatchesOnlyThePlayersOwnToken()
  {
    var playerOne = new Player("Ryan");
    var playerTwo = new Player("Bob");

    Assert.True(playerOne.HasToken(playerOne.Token));
    Assert.False(playerOne.HasToken(playerTwo.Token));
    Assert.False(playerOne.HasToken(playerOne.Id.ToString()));
    Assert.False(playerOne.HasToken(""));
    Assert.False(playerOne.HasToken(null));
  }

  [Fact]
  public void TokenIsNotSerialized()
  {
    var player = new Player("Ryan");

    var json = System.Text.Json.JsonSerializer.Serialize(player);

    Assert.DoesNotContain(player.Token, json);
    Assert.DoesNotContain("Token", json);
  }
}
