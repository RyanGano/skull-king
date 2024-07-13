public record Player
{
  public Guid Id { get; init; } = Guid.NewGuid();
  public string Name { get; private set; }

  public void ChangeName(string newName)
  {
    Name = newName;
  }

    internal PlayerDto MapToDto()
    {
        return new PlayerDto
        {
            Id = Id,
            Name = Name
        };
    }

    public Player(string name)
  {
    Name = name;
  }
}