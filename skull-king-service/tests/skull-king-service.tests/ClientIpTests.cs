namespace skull_king_service.tests;

public class ClientIpTests
{
  [Theory]
  [InlineData("203.0.113.7", "203.0.113.7")]
  [InlineData("203.0.113.7:51234", "203.0.113.7")]
  [InlineData("198.51.100.1, 203.0.113.7:51234", "203.0.113.7")]
  [InlineData("198.51.100.1,203.0.113.7", "203.0.113.7")]
  [InlineData("[2001:db8::1]:51234", "2001:db8::1")]
  [InlineData("2001:db8::1", "2001:db8::1")]
  public void UsesTheLastForwardedForEntry(string forwardedFor, string expected)
  {
    Assert.Equal(expected, ClientIp.FromForwardedFor(forwardedFor));
  }

  [Theory]
  [InlineData(null)]
  [InlineData("")]
  [InlineData("   ")]
  [InlineData("203.0.113.7, ")]
  [InlineData("not-an-address")]
  [InlineData("203.0.113.7, not-an-address")]
  public void IgnoresMissingOrUnparseableEntries(string? forwardedFor)
  {
    Assert.Null(ClientIp.FromForwardedFor(forwardedFor));
  }
}
