using Microsoft.EntityFrameworkCore;

public class SkullKingDbContext : DbContext
{
    public SkullKingDbContext(DbContextOptions<SkullKingDbContext> options)
        : base(options)
    {
    }

    public DbSet<Game> Games { get; set; }
    public DbSet<Player> Players { get; set; }
    public DbSet<Round> Rounds { get; set; }
    public DbSet<PlayerRound> PlayerRounds { get; set; }
    public DbSet<RoundInfo> RoundInfos { get; set; }
}