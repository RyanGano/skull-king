public static class HashUtility
{
  public static int CombineHashCodes<T>(IReadOnlyList<T> items)
  {
    return items.Aggregate(17, (current, item) => current * 23 + (item?.GetHashCode() ?? 0));
  }
}