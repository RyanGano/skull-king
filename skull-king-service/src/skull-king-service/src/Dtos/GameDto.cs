public record GameDto
{
  public string? Id { get; init; }
  public required string? Hash { get; init; }
  public GameStatus? Status { get; init; }
  public List<PlayerRoundsDto>? PlayerRoundInfo { get; init; } = new List<PlayerRoundsDto>();
  public bool IsRandomBid { get; init; }
  public bool ExpansionEnabled { get; init; } = false;
}

public record NewGameDto
{
  public required string PlayerName { get; init; }
  public bool ExpansionEnabled { get; init; } = false;
}