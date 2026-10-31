public record PlayerOrderDto
{
  public List<Guid> PlayerOrder { get; init; } = [];
  public required string KnownHash { get; init; }
}
