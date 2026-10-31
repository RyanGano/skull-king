using System.Text.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

public class TestFixture
{
    public HttpClient Client { get; private set; }
    public SkullKingDbContext DbContext { get; private set; }
    public JsonSerializerOptions JsonSerializerOptions = new JsonSerializerOptions
    {
        PropertyNameCaseInsensitive = true
    };

    public TestFixture() : this("InMemoryDbForTesting")
    {
    }

    protected TestFixture(string databaseName)
    {
        var appFactory = new WebApplicationFactory<Program>()
            .WithWebHostBuilder(builder =>
            {
                // Every test request comes from the same client, so lift the
                // per-client limits out of the way here. RateLimitTests covers them.
                builder.UseSetting("RateLimits:GameReadPerMinute", "1000000");
                builder.UseSetting("RateLimits:GameCreatePerMinute", "1000000");
                builder.UseSetting("RateLimits:GameJoinPerMinute", "1000000");

                builder.ConfigureServices(services =>
                {
                    var descriptor = services.SingleOrDefault(
                        d => d.ServiceType ==
                            typeof(DbContextOptions<SkullKingDbContext>));

                    services.Remove(descriptor!);

                    services.AddDbContext<SkullKingDbContext>(options =>
                    {
                        options.UseInMemoryDatabase(databaseName);
                    });
                });
            });

        Client = appFactory.CreateClient();
        var scope = appFactory.Services.CreateScope();
        DbContext = scope.ServiceProvider.GetRequiredService<SkullKingDbContext>();
    }
}

// For tests that delete rows: keeps them out of the database the other tests share
public class IsolatedTestFixture() : TestFixture("IsolatedInMemoryDbForTesting")
{
}
