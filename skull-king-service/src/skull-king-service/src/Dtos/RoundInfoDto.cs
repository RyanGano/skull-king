public record RoundInfoDto
{
  public Guid Id { get; init; }
  public List<PlayerRoundDto>? PlayerRounds { get; init; }
}
