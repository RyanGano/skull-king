using System.ComponentModel.DataAnnotations;
using System.Text.RegularExpressions;

public record GameId
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