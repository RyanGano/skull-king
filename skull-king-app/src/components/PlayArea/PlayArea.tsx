import {
  CaretLeftSquareFill,
  CaretRightSquareFill,
} from "react-bootstrap-icons";
import classNames from "classnames";
import { Game, GameStatus, Player, PlayerRounds } from "../../types/game";
import { PlayerStatusCard } from "../PlayerStatusCard/PlayerStatusCard";

import "./PlayArea.less";

interface PlayAreaProps {
  game: Game;
  me: Player;
  moveToNextGameStatus: () => void;
  moveToPreviousGameStatus: () => void;
}

export const PlayArea = (props: PlayAreaProps) => {
  const { game, me, moveToNextGameStatus, moveToPreviousGameStatus } = props;

  const gameState =
    game?.status === GameStatus.gameOver
      ? "Game Over"
      : game?.status === GameStatus.biddingClosed
      ? `Bidding Closed (round ${game.roundInfos.length})`
      : game?.status === GameStatus.biddingOpen
      ? `Bidding Open (round ${game.roundInfos.length})`
      : "";

  if (!game) return null;

  if (
    game.status !== GameStatus.biddingOpen &&
    game.status !== GameStatus.biddingClosed &&
    game.status !== GameStatus.gameOver
  )
    return null;

  // Put the current player at the top of the list so they always
  // know to look for their name. Other players should be in the
  // same order on all devices, but if not, it's OK.
  const playerStates: PlayerRounds[] = game.players
    .map((x) => ({
      player: x,
      rounds: game.roundInfos.flatMap((y) =>
        y.playerRounds.filter((z) => z.player.id === x.id).map((z) => z.round)
      ),
    }))
    .sort((a) => (a.player.id === me.id ? -1 : 0));

  return (
    <>
      <div className="playAreaContainer">
        {playerStates.map((x, index) => (
          <div key={index} className="playerStatusCardContainer">
            <PlayerStatusCard
              isMe={x.player.id === me.id}
              playerRounds={x}
              turnPhase={game.status}
              onBidChange={
                x.player.id === me.id
                  ? (newValue) => console.log("onBidChange", newValue)
                  : undefined
              }
              onScoreChange={
                x.player.id === me.id
                  ? (newValue) => console.log("onScoreChange", newValue)
                  : undefined
              }
              dealer={
                ((game.roundInfos.length ?? 0) - 1) % game.players.length ===
                index
              }
            />
          </div>
        ))}

        <div
          className={`playerStatusSpacer ${
            game.players.length % 2 === 1 ? "visible" : ""
          }`}
        />
      </div>
      <div className="gameStatusContainer">
        <CaretLeftSquareFill
          className={classNames("gameStatusNavButton", {
            ["disabled"]: !(
              game.roundInfos.length > 1 ||
              game.status === GameStatus.biddingClosed
            ),
          })}
          onClick={() =>
            game.roundInfos.length > 1 ||
            game.status === GameStatus.biddingClosed
              ? moveToPreviousGameStatus()
              : null
          }
        />
        <span className="gameStatusText">{gameState}</span>
        <CaretRightSquareFill
          className={classNames("gameStatusNavButton", {
            ["disabled"]: !(game.status !== GameStatus.gameOver),
          })}
          onClick={() =>
            game.status !== GameStatus.gameOver ? moveToNextGameStatus() : null
          }
        />
      </div>
    </>
  );
};
