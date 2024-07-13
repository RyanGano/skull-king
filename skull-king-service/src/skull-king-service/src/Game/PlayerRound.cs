public record PlayerRound
{
  public Guid Id { get; init; }
  public required Player? Player { get; init; }
  public required Round? Round { get; init; }

  public static PlayerRound Create(Player player, Round round)
  {
    return new PlayerRound
    {
      Id = Guid.NewGuid(),
      Player = player,
      Round = round
    };
  }

  internal PlayerRoundDto MapToDto()
  {
    return new PlayerRoundDto
    {
      Id = Id,
      Player = Player!.MapToDto(),
      Round = Round!.MapToDto()
    };
  }
}