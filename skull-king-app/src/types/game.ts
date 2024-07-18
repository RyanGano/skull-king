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

export type PlayerRound = {
  id: string;
  player: Player;
  round: Round;
};

export type RoundInfo = {
  id: string;
  playerRounds: PlayerRound[];
};

export type Game = {
  id: string;
  players: Player[];
  status: GameStatus;
  roundInfos: RoundInfo[];
  hash: string;
};
