public record PlayerRoundsDto
{
  public Guid? Id { get; init; }
  public PlayerDto? Player { get; init; }
  public List<RoundDto>? Rounds { get; init; }
}
