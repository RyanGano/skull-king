using System.Security.Cryptography;
using System.Text;
using System.Text.Json.Serialization;

public record Player
{
  public Guid Id { get; init; } = Guid.NewGuid();
  public string Name { get; private set; }

  // A per-player secret, handed only to the player who created or joined with
  // this seat. Game actions are authorized against it; the public Id is for
  // display and is visible to everyone who can read the game. Never serialize it.
  [JsonIgnore]
  public string Token { get; init; } = CreateToken();

  public void ChangeName(string newName)
  {
    Name = newName;
  }

  public bool HasToken(string? token)
  {
    if (string.IsNullOrEmpty(token) || string.IsNullOrEmpty(Token))
      return false;

    return CryptographicOperations.FixedTimeEquals(
      Encoding.UTF8.GetBytes(token),
      Encoding.UTF8.GetBytes(Token));
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

  // 128 random bits, hex encoded
  private static string CreateToken() => Convert.ToHexString(RandomNumberGenerator.GetBytes(16));
}
