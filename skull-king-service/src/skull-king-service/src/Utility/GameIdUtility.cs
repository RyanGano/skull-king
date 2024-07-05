using System.Text.RegularExpressions;

public static class GameIdUtility
{
  public static string GetValidGameId(string? gameId = null)
  {
    if (gameId is null)
      return NormalizeGameId(Path.GetRandomFileName());

    return NormalizeGameId(gameId);
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