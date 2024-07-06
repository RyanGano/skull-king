public record RoundInfo
{
  public IReadOnlyList<PlayerRound> PlayerRounds { get; init; }

  public RoundInfo(IReadOnlyList<Player> players, int roundNumber)
  {
    PlayerRounds = players.Select(p => new PlayerRound(p, new Round(roundNumber))).ToList();
  }

  public RoundInfo(RoundInfo other, PlayerRound updatedPlayerRound)
  {
    PlayerRounds = other.PlayerRounds.Select(x =>
      x.Player.Id != updatedPlayerRound.Player.Id || x.Round.MaxBid != updatedPlayerRound.Round.MaxBid
      ? x
      : updatedPlayerRound).ToList();
  }
}