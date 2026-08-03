using Microsoft.EntityFrameworkCore;

public class SkullKingDbContext(DbContextOptions<SkullKingDbContext> options) : DbContext(options)
{
    public DbSet<Game> Games { get; set; }
    public DbSet<Player> Players { get; set; }
    public DbSet<Round> Rounds { get; set; }
    public DbSet<PlayerRounds> PlayerRoundInfos { get; set; }
    public DbSet<Hash> Hashes { get; set; }
}