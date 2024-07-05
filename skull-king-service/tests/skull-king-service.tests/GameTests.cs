using System.Text.RegularExpressions;

namespace skull_king_service.tests;

public class GameIdTests
{
    [Fact]
    public void CanGetNewGameId()
    {
        var gameId = new GameId();
        Assert.NotNull(gameId.Value);
    }

    [Fact]
    public void GameIdIsLengthOfFour()
    {
        var gameId = new GameId();
        Assert.Equal(4, gameId.Value.Length);
    }

    [Theory]
    [InlineData("AAOA", "AA0A")]
    [InlineData("Adra", "ADRA")]
    [InlineData("O384", "0384")]
    [InlineData("ASDFG", "ASDF")]
    [InlineData("I1i1", "1111")]
    public void GameIdConvertsToValidCharacters(string input, string output)
    {
        var gameId = new GameId(input);

        Assert.Equal(output, gameId.Value);
    }

    [Theory]
    [InlineData("Asd#")]
    [InlineData("Ad#")]
    public void InvalidGameIdThrowsException(string input)
    {
        Assert.ThrowsAny<Exception>(() => new GameId(input));
    }

    [Fact]
    public void NewIdsAreValid()
    {
        for (int i = 0; i < 100_000; i++)
        {
            var gameId = new GameId();

            var normalizedId = new GameId(gameId.Value);

            Assert.Equal(gameId, normalizedId);
        }
    }

    [Fact]
    public void GameIdFromAnotherGameIdIsEqualButNotSame()
    {
        var gameId = new GameId();
        var gameIdCopy = new GameId(gameId);

        Assert.Equal(gameId, gameIdCopy);
        Assert.NotSame(gameId, gameIdCopy);
    }
}