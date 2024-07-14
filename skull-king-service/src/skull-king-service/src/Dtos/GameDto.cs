public record GameDto
{
  public string? Id { get; init; }
  public required string? Hash { get; init; }
  public List<PlayerDto>? Players { get; set; } = new List<PlayerDto>();
  public GameStatus? Status { get; init; }
  public List<RoundInfoDto>? RoundInfos { get; set; } = new List<RoundInfoDto>();
}

public record NewGameDto
{
  public required string PlayerName { get; init; }
}