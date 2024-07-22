using System.Text.Json;

public record Game
{
  public required string Id { get; init; }
  public GameStatus Status { get; private set; }
  public IReadOnlyList<PlayerRounds> PlayerRoundInfo => EditablePlayerRoundInfo;

  public static Game Create(Player controllingPlayer)
  {
    return new Game
    {
      Id = new GameId().Value,
      EditablePlayerRoundInfo = new List<PlayerRounds> { PlayerRounds.Create(controllingPlayer) },
    };
  }

  public static Game Create(GameId gameId, Player controllingPlayer)
  {
    return new Game
    {
      Id = gameId.Value,
      EditablePlayerRoundInfo = new List<PlayerRounds> { PlayerRounds.Create(controllingPlayer) },
    };
  }

  public PlayerRounds AddPlayer(Player player)
  {
    if (PlayerRoundInfo.Any(x => x.Player == player))
      throw new ArgumentException("Player already in game");
    if (PlayerRoundInfo.Count == c_maxPlayers)
      throw new ArgumentException($"Cannot have more than {c_maxPlayers} in a game.");
    if (Status != GameStatus.AcceptingPlayers)
      throw new ArgumentException($"Cannot add player at this time.");

    var playerRounds = PlayerRounds.Create(player);
    EditablePlayerRoundInfo.Add(playerRounds);
    return playerRounds;
  }

  public void RemovePlayer(Player player)
  {
    var indexOfPlayer = EditablePlayerRoundInfo.FindIndex(x => x.Player == player);
    if (indexOfPlayer == -1)
      throw new ArgumentException("Player not found");
    if (indexOfPlayer == 0)
      throw new ArgumentException("Cannot remove first player");

    EditablePlayerRoundInfo.Remove(EditablePlayerRoundInfo.Single(x => x.Player == player));
  }

  public void StartGame()
  {
    if (PlayerRoundInfo.Count < c_minPlayers)
      throw new InvalidOperationException("Cannot start game with less than 2 players");

    Status = GameStatus.BiddingOpen;
    EditablePlayerRoundInfo.ForEach(x => x.AddRound());
  }

  public override int GetHashCode()
  {
    return JsonSerializer.Serialize(this).GetHashCode();
  }

  internal GameDto MapToDto()
  {
    return new GameDto
    {
      Id = Id,
      Hash = GetHashCode().ToString(),
      Status = Status,
      PlayerRoundInfo = PlayerRoundInfo.Select(x => x.MapToDto()).ToList(),
    };
  }

  private Game()
  {
    Status = GameStatus.AcceptingPlayers;
    EditablePlayerRoundInfo = new List<PlayerRounds>();
  }

  private const int c_minPlayers = 2;
  private const int c_maxPlayers = 8;
  private List<PlayerRounds> EditablePlayerRoundInfo { get; init; }
}