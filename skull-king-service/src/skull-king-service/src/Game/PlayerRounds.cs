public record PlayerRounds
{
  public Guid Id { get; init; }
  public required Player? Player { get; init; }
  public IReadOnlyList<Round> Rounds => EditablePlayerRounds;

  public void AddRound(int playerCount)
  {
    if (Rounds!.Count == 10)
      throw new InvalidOperationException("Cannot have more than 10 rounds");

    EditablePlayerRounds!.Add(new Round(int.Min(Rounds.Count + 1, playerCount == 8 ? 8 : 10)));
  }

  public void RemoveLastRound()
  {
    if (EditablePlayerRounds!.Count == 1)
      throw new InvalidOperationException("Cannot remove round before round has started");

    EditablePlayerRounds!.RemoveAt(EditablePlayerRounds.Count - 1);
  }

  public static PlayerRounds Create(Player player)
  {
    return new PlayerRounds
    {
      Id = Guid.NewGuid(),
      Player = player,
      EditablePlayerRounds = new List<Round>()
    };
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
    EditablePlayerRounds = new List<Round>();
  }

  private List<Round> EditablePlayerRounds { get; init; }
}