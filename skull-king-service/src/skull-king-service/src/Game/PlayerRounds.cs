public record PlayerRounds
{
  public Guid Id { get; init; }

  // Where this player sits in the game. Index 0 is the captain, so the order of
  // this collection decides who controls the game; it cannot be left to
  // whatever order the database hands back.
  public int SeatNumber { get; internal set; }

  public required Player? Player { get; init; }
  public IReadOnlyList<Round> Rounds => EditablePlayerRounds;

  public Round? AddRound(int playerCount)
  {
    if (Rounds!.Count == 10)
      throw new InvalidOperationException("Cannot have more than 10 rounds");

    // If the game has 9 players (expansion), allow up to 9 maxBid for middle rounds
    // playerCount is the current player count passed from Game
    var maxForThisRound = playerCount == 8 ? 8 : 10;
    var roundNumber = Rounds.Count + 1;
    var newRound = new Round(int.Min(roundNumber, maxForThisRound), roundNumber);
    EditablePlayerRounds!.Add(newRound);
    return newRound;
  }

  public Round? RemoveLastRound()
  {
    if (EditablePlayerRounds!.Count == 1)
      throw new InvalidOperationException("Cannot remove round before round has started");

    var lastRound = EditablePlayerRounds.Last();
    EditablePlayerRounds!.Remove(lastRound);
    return lastRound;
  }

  public static PlayerRounds Create(Player player)
  {
    return Create(player, 0);
  }

  public static PlayerRounds Create(Player player, int seatNumber)
  {
    return new PlayerRounds
    {
      Id = Guid.NewGuid(),
      SeatNumber = seatNumber,
      Player = player,
      EditablePlayerRounds = []
    };
  }

  // The database does not guarantee the order rounds come back in, so put them
  // back into playing order after they are loaded.
  internal bool SortRounds()
  {
    var wasOutOfOrder = !EditablePlayerRounds
      .Select(x => x.Number)
      .SequenceEqual(EditablePlayerRounds.Select(x => x.Number).Order());

    EditablePlayerRounds.Sort((left, right) => left.Number.CompareTo(right.Number));

    return wasOutOfOrder;
  }

  public void SetBid(int bid)
  {
    if (Rounds!.Count == 0)
      throw new InvalidOperationException("Cannot set bid before round has started");

    Rounds[^1].SetBid(bid);
  }

  public void ClearBid()
  {
    if (Rounds!.Count == 0)
      throw new InvalidOperationException("Cannot set bid before round has started");

    Rounds[^1].ClearBid();
  }

  public void SetScore(int tricksTaken, int bonus)
  {
    if (Rounds!.Count == 0)
      throw new InvalidOperationException("Cannot set score before round has started");

    EditablePlayerRounds[^1].SetTricksTaken(tricksTaken);
    EditablePlayerRounds[^1].SetBonus(bonus);
  }

  public void ClearScore()
  {
    if (Rounds!.Count == 0)
      throw new InvalidOperationException("Cannot set score before round has started");

    EditablePlayerRounds[^1].ClearTricksTaken();
    EditablePlayerRounds[^1].ClearBonus();
  }

  internal PlayerRoundsDto MapToDto()
  {
    return new PlayerRoundsDto
    {
      Id = Id,
      Player = Player!.MapToDto(),
      Rounds = EditablePlayerRounds!.Select(x => x.MapToDto()).ToList(),
    };
  }

  public override int GetHashCode()
  {
    return HashCode.Combine(Id, Player, EditablePlayerRounds, Rounds);
  }

  private PlayerRounds()
  {
    EditablePlayerRounds = [];
  }

  private List<Round> EditablePlayerRounds { get; init; }
}