public record RoundInfo
{
  public Guid Id { get; init; }
  public required IReadOnlyList<PlayerRound>? PlayerRounds { get; init; }

  public static RoundInfo Create(IReadOnlyList<Player> players, int roundNumber)
  {
    return new RoundInfo
    {
      PlayerRounds = players.Select(p => new PlayerRound { Id = Guid.NewGuid(), Player = p, Round = new Round(roundNumber) }).ToList(),
    };
  }

  public static RoundInfo Create(RoundInfo other, PlayerRound updatedPlayerRound)
  {
    return new RoundInfo
    {
      PlayerRounds = other.PlayerRounds!.Select(x =>
        x.Player!.Id != updatedPlayerRound.Player!.Id || x.Round!.MaxBid != updatedPlayerRound.Round!.MaxBid
        ? x
        : updatedPlayerRound).ToList(),
    };
  }

  internal RoundInfoDto MapToDto()
  {
    return new RoundInfoDto
    {
      Id = Id,
      PlayerRounds = PlayerRounds!.Select(x => x.MapToDto()).ToList()
    };
  }

  public RoundInfo()
  {
  }
}