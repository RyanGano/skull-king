public record Game
{
  public GameId Id { get; init; }
  public IReadOnlyList<Player> Players => EditablePlayers;

  public static Game Create(string controllingPlayerName)
  {
    return new Game(new GameId(), new List<Player> { new Player(controllingPlayerName) });
  }

  public void AddPlayer(Player player)
  {
    if (Players.Contains(player))
      throw new ArgumentException("Player already in game");

    EditablePlayers.Add(player);
  }

  public void RemovePlayer(Player player)
  {
    var indexOfPlayer = EditablePlayers.IndexOf(player);
    if (indexOfPlayer == -1)
      throw new ArgumentException("Player not found");
    if (indexOfPlayer == 0)
      throw new ArgumentException("Cannot remove first player");

    EditablePlayers.Remove(player);
  }

  private Game(GameId id, List<Player> players)
  {
    Id = id;
    EditablePlayers = players;
  }

  private List<Player> EditablePlayers { get; init; }

}