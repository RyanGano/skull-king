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

  public void MoveToNextPhase()
  {
    if (Status == GameStatus.AcceptingPlayers)
      throw new InvalidOperationException("Cannot move to next phase until game has started");
    if (Status == GameStatus.GameOver)
      throw new InvalidOperationException("Cannot move to next phase after game has ended");

    if (Status == GameStatus.BiddingOpen)
    {
      // Make sure all players have made a bid (use 0 as default if they have not)
      foreach (var playerWithNoBid in PlayerRoundInfo.Where(x => x.Rounds!.Last().Bid is null))
        playerWithNoBid.SetBid(0);

      Status = GameStatus.BiddingClosed;
    }
    else if (Status == GameStatus.BiddingClosed)
    {
      // Make sure all players have entered a score (use 0 as default if they have not)
      foreach (var playerWithNoScore in PlayerRoundInfo.Where(x => x.Rounds![^1] is { TricksTaken: null } or { Bonus: null }))
        playerWithNoScore.SetScore(playerWithNoScore.Rounds![^1].TricksTaken ?? 0, playerWithNoScore.Rounds![^1].Bonus ?? 0);

      // Check if the game is over
      if (PlayerRoundInfo[0].Rounds!.Count == 10)
      {
        Status = GameStatus.GameOver;
        return;
      }

      // Now add a new round to each player
      foreach (var playerRoundInfo in PlayerRoundInfo)
        playerRoundInfo.AddRound();

      Status = GameStatus.BiddingOpen;
    }
  }

  public void MoveToPreviousPhase()
  {
    if (Status == GameStatus.BiddingOpen && PlayerRoundInfo[0].Rounds!.Count == 1)
      throw new InvalidOperationException("Cannot move to phase earlier than the beginning of the game.");

    if (Status == GameStatus.BiddingClosed)
    {
      // Clear all of the TricksTaken and Bonuses for the current round
      foreach (var playerRoundInfo in PlayerRoundInfo)
        playerRoundInfo.ClearScore();

      Status = GameStatus.BiddingOpen;
    }
    else if (Status == GameStatus.BiddingOpen)
    {
      foreach (var playerRoundInfo in PlayerRoundInfo)
        playerRoundInfo.RemoveLastRound();

      Status = GameStatus.BiddingClosed;
    }
    else if (Status == GameStatus.GameOver)
    {
      Status = GameStatus.BiddingClosed;
    }
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