public record PlayerRounds
{
  public Guid Id { get; init; }
  public required Player? Player { get; init; }
  public IReadOnlyList<Round> Rounds => EditablePlayerRounds;

  public void AddRound()
  {
    if (Rounds!.Count == 10)
      throw new InvalidOperationException("Cannot have more than 10 rounds");

    EditablePlayerRounds!.Add(new Round(Rounds.Count + 1));
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