using System.Diagnostics.CodeAnalysis;

public record PlayerDto
{
  public Guid Id { get; init; }
  public required string? Name { get; init; }
}

// Returned only to the player who just joined (or to the captain who added
// them). It is the one place a player's token leaves the server.
public record JoinedPlayerDto : PlayerDto
{
  public JoinedPlayerDto()
  {
  }

  [SetsRequiredMembers]
  public JoinedPlayerDto(PlayerDto player, string playerToken) : base(player)
  {
    PlayerToken = playerToken;
  }

  public required string PlayerToken { get; init; }
}
