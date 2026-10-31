using System.Net;

public static class ClientIp
{
  // Identifies the caller for per-client rate limiting.
  //
  // App Service's front end appends the address it saw to X-Forwarded-For, so
  // the LAST entry is the one it vouches for. Earlier entries come from the
  // client and can be anything, so they are never used. App Service writes the
  // address with a port ("203.0.113.7:51234", "[2001:db8::1]:51234"), which is
  // stripped so one client is one partition.
  public static string Get(HttpContext httpContext)
  {
    var forwardedFor = httpContext.Request.Headers["X-Forwarded-For"].ToString();
    return FromForwardedFor(forwardedFor)
      ?? httpContext.Connection.RemoteIpAddress?.ToString()
      ?? "unknown";
  }

  public static string? FromForwardedFor(string? forwardedFor)
  {
    if (string.IsNullOrWhiteSpace(forwardedFor))
      return null;

    var last = forwardedFor.Split(',').Last().Trim();
    if (last.Length == 0)
      return null;

    if (IPAddress.TryParse(last, out var address))
      return address.ToString();

    if (IPEndPoint.TryParse(last, out var endPoint))
      return endPoint.Address.ToString();

    return null;
  }
}
