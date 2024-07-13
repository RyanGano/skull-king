
public record RoundDto
{
  public Guid Id { get; init; } = Guid.NewGuid();
  public int MaxBid { get; init; }
  public int? Bid { get; init; }
  public int? TricksTaken { get; init; }
  public int? Bonus { get; init; }
}