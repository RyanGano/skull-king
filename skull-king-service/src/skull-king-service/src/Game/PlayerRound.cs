public record PlayerRound
{
  public Player Player { get; init; }
  public Round Round { get; init; }

  public PlayerRound(Player player, Round round)
  {
    Player = player;
    Round = round;
  }
}