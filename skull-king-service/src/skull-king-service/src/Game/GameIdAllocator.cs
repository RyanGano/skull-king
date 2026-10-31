public static class GameIdAllocator
{
  public const int DefaultMaxAttempts = 10;

  // Draws ids until one is free. Ids are short, so a collision with a live
  // game is possible; it should cost the caller a retry, not an error.
  // Returns null only if every attempt was taken.
  public static async Task<GameId?> FindUnusedAsync(
    Func<GameId> createId,
    Func<GameId, Task<bool>> isTaken,
    int maxAttempts = DefaultMaxAttempts)
  {
    for (var attempt = 0; attempt < maxAttempts; attempt++)
    {
      var candidate = createId();
      if (!await isTaken(candidate))
        return candidate;
    }

    return null;
  }
}
