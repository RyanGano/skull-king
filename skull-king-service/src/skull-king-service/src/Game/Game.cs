public record Game
{
  public required string Id { get; init; }
  public IReadOnlyList<Player> Players => EditablePlayers;
  public GameStatus Status { get; private set; }
  public IReadOnlyList<RoundInfo> RoundInfos => EditableRoundInfos;

  public static Game Create(Player controllingPlayer)
  {
    return new Game
    {
      Id = new GameId().Value,
      EditablePlayers = new List<Player> { controllingPlayer },
      EditableRoundInfos = new List<RoundInfo>()
    };
  }

  public void AddPlayer(Player player)
  {
    if (Players.Contains(player))
      throw new ArgumentException("Player already in game");
    if (Players.Count == c_maxPlayers)
      throw new ArgumentException($"Cannot have more than {c_maxPlayers} in a game.");

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

  public void StartGame()
  {
    if (Players.Count < c_minPlayers)
      throw new InvalidOperationException("Cannot start game with less than 2 players");

    Status = GameStatus.BiddingOpen;
    EditableRoundInfos.Add(RoundInfo.Create(Players, 1));
  }

  public override int GetHashCode()
  => HashCode.Combine(Id, HashUtility.CombineHashCodes(Players), Status, HashUtility.CombineHashCodes(RoundInfos));

  private Game()
  {
    EditablePlayers = new List<Player>();
    EditableRoundInfos = new List<RoundInfo>();
    Status = GameStatus.AcceptingPlayers;
  }

  private const int c_minPlayers = 2;
  private const int c_maxPlayers = 8;
  private List<Player> EditablePlayers { get; init; }
  private List<RoundInfo> EditableRoundInfos { get; init; }
}