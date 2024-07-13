public record PlayerRoundDto
{
  public Guid? Id { get; init; }
  public PlayerDto? Player { get; init; }
  public RoundDto? Round { get; init; }
}
