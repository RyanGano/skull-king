namespace skull_king_service.tests;

public class GameIdAllocatorTests
{
  [Fact]
  public async Task RetriesUntilAnIdIsFree()
  {
    var candidates = new Queue<GameId>([new GameId("AAAA"), new GameId("BBBB"), new GameId("CCCC")]);
    var taken = new HashSet<string> { "AAAA", "BBBB" };

    var gameId = await GameIdAllocator.FindUnusedAsync(candidates.Dequeue, id => Task.FromResult(taken.Contains(id.Value)));

    Assert.Equal("CCCC", gameId?.Value);
  }

  [Fact]
  public async Task UsesTheFirstIdWhenItIsFree()
  {
    var attempts = 0;

    var gameId = await GameIdAllocator.FindUnusedAsync(
      () => { attempts++; return new GameId("AAAA"); },
      _ => Task.FromResult(false));

    Assert.Equal("AAAA", gameId?.Value);
    Assert.Equal(1, attempts);
  }

  [Fact]
  public async Task GivesUpAfterMaxAttempts()
  {
    var attempts = 0;

    var gameId = await GameIdAllocator.FindUnusedAsync(
      () => { attempts++; return new GameId("AAAA"); },
      _ => Task.FromResult(true),
      maxAttempts: 3);

    Assert.Null(gameId);
    Assert.Equal(3, attempts);
  }
}
