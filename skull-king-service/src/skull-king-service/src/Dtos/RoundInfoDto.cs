public record RoundInfoDto
{
  public Guid Id { get; init; }
  public List<PlayerRoundsDto>? PlayerRounds { get; init; }
}
