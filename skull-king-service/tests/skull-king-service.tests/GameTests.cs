namespace skull_king_service.tests;

public class GameTests
{
  [Fact]
  public void CanCreateNewGame()
  {
    var game = Game.Create(new Player("Ryan"));

    Assert.NotNull(game);
    Assert.True(game.PlayerRoundInfo.Single() is PlayerRounds { Player: { Name: "Ryan", Id: { } } });
    Assert.NotNull(game.Id);
    Assert.Equal(GameStatus.AcceptingPlayers, game.Status);
  }

  [Fact]
  public void CanAddPlayerToGame()
  {
    var game = Game.Create(new Player("Ryan"));
    var controllingPlayer = game.PlayerRoundInfo.First().Player;

    var newPlayer = new Player("Bob");
    game.AddPlayer(newPlayer);

    Assert.Equal(new List<Player> { controllingPlayer!, newPlayer }, game.PlayerRoundInfo.Select(x => x.Player));
  }

  [Fact]
  public void CannotAddExistingPlayerToGame()
  {
    var game = Game.Create(new Player("Ryan"));
    var controllingPlayer = game.PlayerRoundInfo.First().Player;

    Assert.Throws<ArgumentException>(() => game.AddPlayer(controllingPlayer!));
  }

  [Fact]
  public void CannotAddMoreThanEightPlayersToGame()
  {
    var game = Game.Create(new Player("One"));
    game.AddPlayer(new Player("Two"));
    game.AddPlayer(new Player("Three"));
    game.AddPlayer(new Player("Four"));
    game.AddPlayer(new Player("Five"));
    game.AddPlayer(new Player("Six"));
    game.AddPlayer(new Player("Seven"));
    game.AddPlayer(new Player("Eight"));

    Assert.Throws<ArgumentException>(() => game.AddPlayer(new Player("Nine")));
  }

  [Fact]
  public void CanRemovePlayerFromGame()
  {
    var game = Game.Create(new Player("Ryan"));
    var controllingPlayer = game.PlayerRoundInfo.First().Player;
    var newPlayer = new Player("Bob");
    game.AddPlayer(newPlayer);

    game.RemovePlayer(newPlayer);

    Assert.Equal(new List<Player> { controllingPlayer! }, game.PlayerRoundInfo.Select(x => x.Player));
  }

  [Fact]
  public void CannotRemoveNonExistentPlayerFromGame()
  {
    var game = Game.Create(new Player("Ryan"));
    var newPlayer = new Player("Bob");
    game.AddPlayer(newPlayer);

    var nonExistentPlayer = new Player("Bob2");

    Assert.Throws<ArgumentException>(() => game.RemovePlayer(nonExistentPlayer));
  }

  [Fact]
  public void CannotRemoveFirstPlayerFromGame()
  {
    var game = Game.Create(new Player("Ryan"));
    var controllingPlayer = game.PlayerRoundInfo.First().Player;
    var newPlayer = new Player("Bob");
    game.AddPlayer(newPlayer);

    Assert.Throws<ArgumentException>(() => game.RemovePlayer(controllingPlayer!));
  }

  [Fact]
  public void CanStartGame()
  {
    var game = Game.Create(new Player("Ryan"));
    game.AddPlayer(new Player("Bob"));

    game.StartGame();

    Assert.True(game.PlayerRoundInfo.First().Rounds!.Count == 1);
    Assert.Equal(1, game.PlayerRoundInfo.SelectMany(x => x.Rounds!.Select(y => y.MaxBid!)).Distinct().Single());
    Assert.Equal(GameStatus.BiddingOpen, game.Status);
  }

  [Fact]
  public void CannotStartGameWithOnePlayer()
  {
    var game = Game.Create(new Player("Ryan"));

    Assert.Throws<InvalidOperationException>(() => game.StartGame());
  }

  [Fact]
  public void CannotAddPlayerToExistingGame()
  {
    var game = Game.Create(new Player("Ryan"));
    game.AddPlayer(new Player("Bob"));
    game.StartGame();

    Assert.Throws<ArgumentException>(() => game.AddPlayer(new Player("Too late")));
  }

  [Fact]
  public void CannotStartGameTwice()
  {
    var game = Game.Create(new Player("Ryan"));
    game.AddPlayer(new Player("Bob"));
    game.StartGame();

    Assert.Throws<InvalidOperationException>(() => game.StartGame());
  }

  [Fact]
  public void GameHashesAreNotEqual()
  {
    var player = new Player("Ryan");
    var game = Game.Create(player);
    var originalHashCode = game.GetHashCode();

    game.AddPlayer(new Player("Bob"));

    Assert.NotEqual(originalHashCode, game.GetHashCode());
  }

  [Fact]
  public void CanMoveGameToNextPhase()
  {
    var game = Game.Create(new Player("Ryan"));
    game.AddPlayer(new Player("Bob"));
    game.StartGame();

    game.MoveToNextPhase();

    Assert.Equal(GameStatus.BiddingClosed, game.Status);
    Assert.Equal(1, game.PlayerRoundInfo.Select(x => x.Rounds!.Count).Distinct().Single());
  }

  [Fact]
  public void CanMoveGameThroughAllPhases()
  {
    var game = Game.Create(new Player("Ryan"));
    game.AddPlayer(new Player("Bob"));
    game.StartGame();

    for (int i = 0; i < 20; i++)
      game.MoveToNextPhase();

    Assert.Equal(GameStatus.GameOver, game.Status);
    Assert.Equal(10, game.PlayerRoundInfo.Select(x => x.Rounds!.Count).Distinct().Single());
  }

  [Fact]
  public void CannotMoveGamePastEndOfGame()
  {
    var game = Game.Create(new Player("Ryan"));
    game.AddPlayer(new Player("Bob"));
    game.StartGame();

    for (int i = 0; i < 20; i++)
      game.MoveToNextPhase();

    Assert.Throws<InvalidOperationException>(() => game.MoveToNextPhase());
  }


  [Fact]
  public void CanMoveGameToPreviousPhase()
  {
    var game = Game.Create(new Player("Ryan"));
    game.AddPlayer(new Player("Bob"));
    game.StartGame();

    game.PlayerRoundInfo[0].SetBid(1);
    game.PlayerRoundInfo[1].SetBid(1);
    var gameHash = game.GetHashCode();

    game.MoveToNextPhase();
    game.PlayerRoundInfo[0].SetScore(1, 10);
    game.PlayerRoundInfo[1].SetScore(0, 0);
    game.MoveToPreviousPhase();

    Assert.Equal(GameStatus.BiddingOpen, game.Status);
    Assert.Equal(gameHash, game.GetHashCode());
  }

  [Fact]
  public void CanMoveGameBackwardThroughAllPhases()
  {
    var game = Game.Create(new Player("Ryan"));
    game.AddPlayer(new Player("Bob"));
    game.StartGame();

    int? gameHash = null;

    for (int i = 0; i < 10; i++)
    {
      // Set a bid for each player
      game.PlayerRoundInfo[0].SetBid(s_rand.Next(0, i + 1));
      game.PlayerRoundInfo[1].SetBid(s_rand.Next(0, i + 1));

      // Store the "starting" game state (we never move before the very first bid)
      // so we need to get the state after the first bid's are made
      gameHash ??= game.GetHashCode();

      game.MoveToNextPhase();
      // Set a Score for each player
      game.PlayerRoundInfo[0].SetScore(s_rand.Next(0, i + 1), 0);
      game.PlayerRoundInfo[1].SetScore(s_rand.Next(0, i + 1), 0);
      game.MoveToNextPhase();
    }

    Assert.Equal(GameStatus.GameOver, game.Status);

    for (int i = 0; i < 20; i++)
      game.MoveToPreviousPhase();

    Assert.Equal(GameStatus.BiddingOpen, game.Status);
    Assert.Equal(gameHash!.Value, game.GetHashCode());
  }

  [Fact]
  public void CannotMoveGameBackwardPastBeginningOfGame()
  {
    var game = Game.Create(new Player("Ryan"));
    game.AddPlayer(new Player("Bob"));
    game.StartGame();

    Assert.Throws<InvalidOperationException>(() => game.MoveToPreviousPhase());
  }

  [Fact]
  public void CanReorderPlayers()
  {
    var game = Game.Create(new Player("Ryan"));
    game.AddPlayer(new Player("Bob"));
    game.AddPlayer(new Player("Mary"));

    IReadOnlyList<Guid> newOrder = [
      game.PlayerRoundInfo[0].Player!.Id,
      game.PlayerRoundInfo[2].Player!.Id,
      game.PlayerRoundInfo[1].Player!.Id,
    ];
    game.SetPlayerOrder(newOrder);

    Assert.Equal(newOrder, game.PlayerRoundInfo.Select(x => x.Player!.Id));
  }

  [Fact]
  public void CanReorderPlayersMultipleTimes()
  {
    var game = Game.Create(new Player("Ryan"));
    game.AddPlayer(new Player("Bob"));
    game.AddPlayer(new Player("Mary"));
    game.AddPlayer(new Player("John"));

    IReadOnlyList<Guid> newOrder = [
      game.PlayerRoundInfo[0].Player!.Id,
      game.PlayerRoundInfo[2].Player!.Id,
      game.PlayerRoundInfo[1].Player!.Id,
      game.PlayerRoundInfo[3].Player!.Id,
    ];
    game.SetPlayerOrder(newOrder);

    Assert.Equal(newOrder, game.PlayerRoundInfo.Select(x => x.Player!.Id));

    IReadOnlyList<Guid> newOrder2 = [
      game.PlayerRoundInfo[0].Player!.Id,
      game.PlayerRoundInfo[2].Player!.Id,
      game.PlayerRoundInfo[1].Player!.Id,
      game.PlayerRoundInfo[3].Player!.Id,
    ];
    game.SetPlayerOrder(newOrder2);

    Assert.Equal(newOrder2, game.PlayerRoundInfo.Select(x => x.Player!.Id));
  }

  [Fact]
  public void CannotReorderExtraPlayers()
  {
    var game = Game.Create(new Player("Ryan"));
    game.AddPlayer(new Player("Bob"));
    game.AddPlayer(new Player("Mary"));

    var originalOrder = game.PlayerRoundInfo.Select(x => x.Player!.Id).ToList();
    IReadOnlyList<Guid> newOrder = [
      game.PlayerRoundInfo[0].Player!.Id,
      game.PlayerRoundInfo[2].Player!.Id,
      game.PlayerRoundInfo[1].Player!.Id,
      new Guid()
    ];

    Assert.Throws<ArgumentException>(() => game.SetPlayerOrder(newOrder));
    Assert.Equal(originalOrder, game.PlayerRoundInfo.Select(x => x.Player!.Id));
  }

  [Fact]
  public void CannotReorderFakePlayers()
  {
    var game = Game.Create(new Player("Ryan"));
    game.AddPlayer(new Player("Bob"));

    var originalOrder = game.PlayerRoundInfo.Select(x => x.Player!.Id).ToList();
    IReadOnlyList<Guid> newOrder = [
      game.PlayerRoundInfo[0].Player!.Id,
      new Guid()
    ];

    Assert.Throws<ArgumentException>(() => game.SetPlayerOrder(newOrder));
    Assert.Equal(originalOrder, game.PlayerRoundInfo.Select(x => x.Player!.Id));
  }

  [Fact]
  public void CannotReorderPlayersAfterGameStarts()
  {
    var game = Game.Create(new Player("Ryan"));
    game.AddPlayer(new Player("Bob"));
    game.AddPlayer(new Player("Mary"));

    var originalOrder = game.PlayerRoundInfo.Select(x => x.Player!.Id).ToList();
    IReadOnlyList<Guid> newOrder = [
      game.PlayerRoundInfo[0].Player!.Id,
      game.PlayerRoundInfo[2].Player!.Id,
      game.PlayerRoundInfo[1].Player!.Id,
    ];
    game.StartGame();

    Assert.Throws<ArgumentException>(() => game.SetPlayerOrder(newOrder));
    Assert.Equal(originalOrder, game.PlayerRoundInfo.Select(x => x.Player!.Id));
  }

  [Fact]
  public void CannotReorderFirstPlayer()
  {
    var game = Game.Create(new Player("Ryan"));
    game.AddPlayer(new Player("Bob"));
    game.AddPlayer(new Player("Mary"));

    var originalOrder = game.PlayerRoundInfo.Select(x => x.Player!.Id).ToList();
    IReadOnlyList<Guid> newOrder = [
      game.PlayerRoundInfo[2].Player!.Id,
      game.PlayerRoundInfo[0].Player!.Id,
      game.PlayerRoundInfo[1].Player!.Id,
    ];

    Assert.Throws<ArgumentException>(() => game.SetPlayerOrder(newOrder));
    Assert.Equal(originalOrder, game.PlayerRoundInfo.Select(x => x.Player!.Id));
  }

  [Theory]
  [InlineData(false)]
  [InlineData(true)]
  public void CanStartRandomBidGame(bool gameIsRandomBid)
  {
    var game = Game.Create(new Player("Ryan"));
    game.AddPlayer(new Player("Bob"));

    game.StartGame(gameIsRandomBid, 0);

    Assert.Equal(gameIsRandomBid, game.IsRandomBid);
  }

  [Theory]
  [InlineData(false)]
  [InlineData(true)]
  public void RandomBidGameAddsThirdPlayerIfNeeded(bool hasEnoughPlayers)
  {
    var game = Game.Create(new Player("Ryan"));
    game.AddPlayer(new Player("Bob"));

    if (hasEnoughPlayers)
      game.AddPlayer(new Player("Mary"));


    game.StartGame(true, GameDifficulty.Easy);

    Assert.True(game.IsRandomBid);
    Assert.Equal(3, game.PlayerRoundInfo.Count);
  }

  [Fact]
  public void RandomBidGameSetsBidsAutomatically()
  {
    var game = Game.Create(new Player("Ryan"));
    game.AddPlayer(new Player("Bob"));
    game.AddPlayer(new Player("Mary"));

    game.StartGame(true, GameDifficulty.Easy);

    for (int i = 1; i <= 10; i++)
    {
      Assert.True(game.Status == GameStatus.BiddingClosed);
      Assert.Equal(game.PlayerRoundInfo.First().Rounds.Count, game.PlayerRoundInfo.Select(x => x.Rounds.Last().Bid).Sum());
      game.MoveToNextPhase();
    }
  }

  [Fact]
  public void DifficultyIsNullForNonRandomBidGame()
  {
    var game = Game.Create(new Player("Ryan"));
    game.AddPlayer(new Player("Bob"));
    game.AddPlayer(new Player("Mary"));

    game.StartGame(false, GameDifficulty.Easy);

    Assert.Null(game.Difficulty);
  }

  [Theory]
  [InlineData(GameDifficulty.Easy)]
  [InlineData(GameDifficulty.Medium)]
  [InlineData(GameDifficulty.Hard)]
  public void SetRandomGameDificulty(GameDifficulty difficulty)
  {
    var game = Game.Create(new Player("Ryan"));
    game.AddPlayer(new Player("Bob"));
    game.AddPlayer(new Player("Mary"));

    game.StartGame(true, difficulty);

    Assert.Equal(difficulty, game.Difficulty);

    bool hasImperfectBid = false;

    for (int i = 1; i <= 10; i++)
    {
      var numberOfTricks = game.PlayerRoundInfo.First().Rounds.Count;
      var minBid = difficulty switch
      {
        GameDifficulty.Easy => int.Max(0, numberOfTricks),
        GameDifficulty.Medium => int.Max(0, numberOfTricks - 1),
        GameDifficulty.Hard => int.Max(0, numberOfTricks - 2),
        _ => throw new ArgumentException("Invalid difficulty")
      };

      var maxBid = difficulty switch
      {
        GameDifficulty.Easy => numberOfTricks,
        GameDifficulty.Medium => numberOfTricks + 1,
        GameDifficulty.Hard => numberOfTricks + 2,
        _ => throw new ArgumentException("Invalid difficulty")
      };

      Assert.True(game.Status == GameStatus.BiddingClosed);

      var allCurrentBids = game.PlayerRoundInfo.Select(x => x.Rounds.Last().Bid).ToList();
      var totalBidCount = allCurrentBids.Sum();
      Assert.True(totalBidCount >= minBid && totalBidCount <= maxBid);
      Assert.True(allCurrentBids.All(x => x <= numberOfTricks));

      hasImperfectBid = hasImperfectBid || totalBidCount != numberOfTricks;

      game.MoveToNextPhase();
    }

    if (difficulty != GameDifficulty.Easy)
      Assert.True(hasImperfectBid);
  }

  private static Random s_rand = new Random();
}