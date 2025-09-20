public record PlayerOrderDto
{
  public List<Guid> PlayerOrder { get; init; } = new List<Guid>();
  public Guid PlayerId { get; init; }
  public required string KnownHash { get; init; }
}