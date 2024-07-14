public record PlayerDto
{
  public Guid Id { get; init; }
  public required string? Name { get; init; }
}