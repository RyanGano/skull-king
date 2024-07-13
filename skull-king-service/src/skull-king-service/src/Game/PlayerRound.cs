public record PlayerRound
{
  public Guid Id { get; init; }
  public required Player? Player { get; init; }
  public required Round? Round { get; init; }

}