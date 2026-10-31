using System.Diagnostics.CodeAnalysis;

public record GameDto
{
  public string? Id { get; init; }
  public required string? Hash { get; init; }
  public GameStatus? Status { get; init; }
  public List<PlayerRoundsDto>? PlayerRoundInfo { get; init; } = [];
  public bool IsRandomBid { get; init; }
  public bool ExpansionEnabled { get; init; } = false;
}

// Returned only to the captain when the game is created: the game plus the
// captain's own player token.
public record CreatedGameDto : GameDto
{
  public CreatedGameDto()
  {
  }

  [SetsRequiredMembers]
  public CreatedGameDto(GameDto game, string playerToken) : base(game)
  {
    PlayerToken = playerToken;
  }

  public required string PlayerToken { get; init; }
}

public record NewGameDto
{
  public required string PlayerName { get; init; }
  public bool ExpansionEnabled { get; init; } = false;
}
