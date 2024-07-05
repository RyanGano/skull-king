using System.Text.RegularExpressions;

namespace skull_king_service.tests;

public class GameIdTests
{
    [Fact]
    public void CanGetNewGameId()
    {
        var gameId = GameIdUtility.GetValidGameId();
        Assert.NotNull(gameId);
    }

    [Fact]
    public void GameIdIsLengthOfFour()
    {
        var gameId = GameIdUtility.GetValidGameId();
        Assert.Equal(4, gameId.Length);
    }

    [Theory]
    [InlineData("AAOA", "AA0A")]
    [InlineData("Adra", "ADRA")]
    [InlineData("O384", "0384")]
    [InlineData("ASDFG", "ASDF")]
    [InlineData("I1i1", "1111")]
    public void GameIdConvertsToValidCharacters(string input, string output)
    {
        var gameId = GameIdUtility.GetValidGameId(input);

        Assert.Equal(output, gameId);
    }

    [Theory]
    [InlineData("Asd#")]
    [InlineData("Ad#")]
    public void InvalidGameIdThrowsException(string input)
    {
        Assert.ThrowsAny<Exception>(() => GameIdUtility.GetValidGameId(input));
    }

    [Fact]
    public void NewIdsAreValid()
    {
        for (int i = 0; i < 100_000; i++)
        {
            var gameId = GameIdUtility.GetValidGameId();

            var normalizedId = GameIdUtility.GetValidGameId(gameId);

            Assert.Matches(gameId, normalizedId);
        }
    }
}