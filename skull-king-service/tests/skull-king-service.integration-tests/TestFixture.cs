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

    public TestFixture()
    {
        var appFactory = new WebApplicationFactory<Program>()
            .WithWebHostBuilder(builder =>
            {
                builder.ConfigureServices(services =>
                {
                    var descriptor = services.SingleOrDefault(
                        d => d.ServiceType ==
                            typeof(DbContextOptions<SkullKingDbContext>));

                    services.Remove(descriptor!);

                    services.AddDbContext<SkullKingDbContext>(options =>
                    {
                        options.UseInMemoryDatabase("InMemoryDbForTesting");
                    });
                });
            });

        Client = appFactory.CreateClient();
        var scope = appFactory.Services.CreateScope();
        DbContext = scope.ServiceProvider.GetRequiredService<SkullKingDbContext>();
    }
}