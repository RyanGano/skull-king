import {
  CaretLeftSquareFill,
  CaretRightSquareFill,
} from "react-bootstrap-icons";
import classNames from "classnames";
import { Game, GameStatus, Player } from "../../types/game";
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
      ? `Bidding Closed (round ${
          game.playerRoundInfo?.[0]?.rounds.length ?? 0
        })`
      : game?.status === GameStatus.biddingOpen
      ? `Bidding Open (round ${game.playerRoundInfo?.[0]?.rounds.length ?? 0})`
      : "";

  if (!game) return null;

  if (
    game.status !== GameStatus.biddingOpen &&
    game.status !== GameStatus.biddingClosed &&
    game.status !== GameStatus.gameOver
  )
    return null;

  const dealerId =
    game.playerRoundInfo[
      ((game.playerRoundInfo[0].rounds.length ?? 0) - 1) %
        game.playerRoundInfo.length
    ].player.id;

  // Put the current player at the top of the list so they always
  // know to look for their name. Other players should be in the
  // same order on all devices, but if not, it's OK.
  const playerRounds =
    [...game.playerRoundInfo].sort((a) => (a.player.id === me.id ? -1 : 0)) ??
    [];

  return (
    <>
      <div className="playAreaContainer">
        {playerRounds.map((x, index) => (
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
              dealer={x.player.id === dealerId}
            />
          </div>
        ))}

        <div
          className={`playerStatusSpacer ${
            (game.playerRoundInfo?.length ?? 0) % 2 === 1 ? "visible" : ""
          }`}
        />
      </div>
      <div className="gameStatusContainer">
        <CaretLeftSquareFill
          className={classNames("gameStatusNavButton", {
            ["disabled"]: !(
              game.playerRoundInfo[0].rounds.length > 1 ||
              game.status === GameStatus.biddingClosed
            ),
            ["hidden"]: !(game.playerRoundInfo[0].player.id === me.id),
          })}
          onClick={() =>
            game.playerRoundInfo[0].rounds.length > 1 ||
            game.status === GameStatus.biddingClosed
              ? moveToPreviousGameStatus()
              : null
          }
        />
        <span className="gameStatusText">{gameState}</span>
        <CaretRightSquareFill
          className={classNames("gameStatusNavButton", {
            ["disabled"]: !(game.status !== GameStatus.gameOver),
            ["hidden"]: !(game.playerRoundInfo[0].player.id === me.id),
          })}
          onClick={() =>
            game.status !== GameStatus.gameOver ? moveToNextGameStatus() : null
          }
        />
      </div>
    </>
  );
};
