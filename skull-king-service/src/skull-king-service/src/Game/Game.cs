public record Game
{
  public GameId Id { get; init; }
  public IReadOnlyList<string> Players => EditablePlayers;

  public static Game Create(string controllingPlayerName)
  {
    return new Game(new GameId(), new List<string> { controllingPlayerName });
  }

  public void AddPlayer(string playerName)
  {
    if (Players.Contains(playerName))
      throw new ArgumentException("Player already in game");

    EditablePlayers.Add(playerName);
  }

  public void RemovePlayer(string playerName)
  {
    var indexOfPlayer = EditablePlayers.IndexOf(playerName);
    if (indexOfPlayer == -1)
      throw new ArgumentException("Player not found");
    if (indexOfPlayer == 0)
      throw new ArgumentException("Cannot remove first player");

    EditablePlayers.Remove(playerName);
  }

  private Game(GameId id, List<string> players)
  {
    Id = id;
    EditablePlayers = players;
  }

  private List<string> EditablePlayers { get; init; }

}