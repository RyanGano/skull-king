export enum GameStatus {
  acceptingPlayers = 0,
  biddingOpen = 1,
  biddingClosed = 2,
  gameOver = 3,
}

export type Round = {
  id: string;
  maxBid: number;
  bid?: number;
  tricksTaken?: number;
  bonus?: number;
};

export type Player = {
  id: string;
  name: string;
};

export enum GameDifficulty {
  Easy = 0,
  Medium = 1,
  Hard = 2,
}

export type Game = {
  id: string;
  status: GameStatus;
  playerRoundInfo: PlayerRounds[];
  hash: string;
};

export type PlayerRounds = {
  id: string;
  player: Player;
  rounds: Round[];
};
