public record Round
{
  public Round(int maxBid)
    : this(maxBid, maxBid)
  {
  }

  public Round(int maxBid, int number)
  {
    if (0 < maxBid && maxBid < 11)
      MaxBid = maxBid;
    else
      throw new ArgumentException("Max bid must be between 1 and 10");

    Number = number;
    Id = Guid.NewGuid();
  }

  public Round SetBid(int bid)
  {
    if (bid < 0 || bid > MaxBid)
      throw new ArgumentException("Bid must be between 0 and the max bid");

    Bid = bid;
    return this;
  }

  public Round ClearBid()
  {
    Bid = null;
    return this;
  }

  public Round SetTricksTaken(int tricksTaken)
  {
    if (Bid is null)
      throw new ArgumentException("Cannot set tricks taken without a bid");
    if (tricksTaken < 0 || tricksTaken > MaxBid)
      throw new ArgumentException("Tricks taken must be between 0 and the max bid");

    TricksTaken = tricksTaken;
    return this;
  }

  public Round ClearTricksTaken()
  {
    TricksTaken = null;
    return this;
  }

  public Round SetBonus(int bonus)
  {
    if (bonus != 0)
    {
      if (Bid is null)
        throw new ArgumentException("Cannot set bonus without a bid");
      if (Bid != TricksTaken)
        throw new ArgumentException("Cannot set bonus without matching bid and tricks taken");
      if (bonus % 5 != 0)
        throw new ArgumentException("Bonus must be a multiple of 5");
    }

    Bonus = bonus;
    return this;
  }

  public void ClearBonus()
  {
    Bonus = null;
  }

  public int GetScore()
  {
    var bid = Bid ?? 0;
    var tricksTaken = TricksTaken ?? 0;
    var bonus = Bonus ?? 0;

    return bid != tricksTaken
      ? bid != 0
        ? -Math.Abs(bid - tricksTaken) * 10
        : -MaxBid * 10
      : bid != 0
        ? bid * 20 + bonus
        : MaxBid * 10 + bonus;
  }

  internal RoundDto MapToDto()
  {
    return new RoundDto
    {
      Id = Id,
      MaxBid = MaxBid,
      Bid = Bid,
      TricksTaken = TricksTaken,
      Bonus = Bonus
    };
  }

  public Guid Id { get; init; } = Guid.NewGuid();

  // Which round of the game this is (1-10). The rounds a player has played are
  // only meaningful in order, and the order they come back from the database is
  // not guaranteed, so the position is stored rather than inferred.
  public int Number { get; private set; }

  public int MaxBid { get; private set; }
  public int? Bid { get; private set; }
  public int? TricksTaken { get; private set; }
  public int? Bonus { get; private set; }
}