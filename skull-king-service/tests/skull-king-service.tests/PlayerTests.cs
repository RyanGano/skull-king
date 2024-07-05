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
}