using System.ComponentModel.DataAnnotations;

public record Hash
{
  [Key]
  public required string? GameId { get; init; }
  public required string? Value { get; set; }
}