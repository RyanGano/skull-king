public record Player
{
  public Guid Id { get; init; } = Guid.NewGuid();
  public string Name { get; private set; }

  public void ChangeName(string newName)
  {
    Name = newName;
  }

  public Player(string name)
  {
    Name = name;
  }
}