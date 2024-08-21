using System.ComponentModel.DataAnnotations;
using System.Diagnostics.CodeAnalysis;
using System.Text.RegularExpressions;

public record GameId : IParsable<GameId>
{
  public GameId() : this(Path.GetRandomFileName())
  {
  }

  public GameId(string id)
  {
    Value = NormalizeGameId(id);
  }

  public GameId(GameId gameId)
  {
    Value = gameId.Value;
  }

  [Key]
  public string Value { get; init; }

  public static GameId Parse(string s, IFormatProvider? provider)
  {
    return new GameId(s);
  }

  public static bool TryParse([NotNullWhen(true)] string? s, IFormatProvider? provider, [MaybeNullWhen(false)] out GameId result)
  {
    if (s is null)
    {
      result = null;
      return false;
    }

    try
    {
      result = Parse(s, provider);
    }
    catch (ArgumentException)
    {
      result = null;
      return false;
    }

    return true;
  }

  private static string NormalizeGameId(string input)
  {
    var normalizedId = input
      .ToUpper()
      .Substring(0, 4)
      .Replace("O", "0")
      .Replace("I", "1");

    // An ID can only be four capital Alpha-Numeric characters
    // that don't have the letters O or I
    if (!Regex.IsMatch(normalizedId, @"^[A-HJ-NP-Z0-9]{4}$"))
      throw new ArgumentException("Could not normalize gameId");

    return normalizedId;
  }
}