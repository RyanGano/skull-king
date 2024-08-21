import {
  CaretLeftSquareFill,
  CaretRightSquareFill,
} from "react-bootstrap-icons";
import classNames from "classnames";
import { Game, GameStatus, Player } from "../../types/game";
import { PlayerStatusCard } from "../PlayerStatusCard/PlayerStatusCard";

import "./PlayArea.less";
import { GameSetBidUri, GameSetScoreUri } from "../../service-paths";
import { callGetRoute } from "../../utils/api-utils";
import { useCallback, useEffect, useState } from "react";
import { Spinner } from "react-bootstrap";

interface PlayAreaProps {
  game: Game;
  me: Player;
  moveToNextGameStatus: () => void;
  moveToPreviousGameStatus: () => void;
  gameChanging: boolean;
  getCurrentHash: () => Promise<string>;
}

export const PlayArea = (props: PlayAreaProps) => {
  const {
    game,
    me,
    moveToNextGameStatus,
    moveToPreviousGameStatus,
    gameChanging,
    getCurrentHash,
  } = props;
  const [changingGame, setChangingGame] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);

  useEffect(() => {
    if (gameChanging || changingGame) {
      const timer = setTimeout(() => setShowOverlay(true), 500);
      return () => clearTimeout(timer);
    } else {
      setShowOverlay(false);
    }
  }, [changingGame, gameChanging]);

  const changeBid = useCallback(
    async (bid: number, hash?: string) => {
      if (!game || !me) {
        console.log("No game or player");
        return;
      }

      setChangingGame(true);
      // Attempt to update the bid
      const result = await callGetRoute(
        GameSetBidUri(game.id, me.id, bid, hash ?? game.hash)
      );

      if (result.status !== 200) {
        console.log("Could not set bid");

        if (result.status === 409) {
          setTimeout(async () => {
            const hash = await getCurrentHash();
            changeBid(bid, hash);
          }, 1000);
        }
      }

      if (result.status !== 409) {
        setChangingGame(false);
      }
    },
    [game, getCurrentHash, me]
  );

  const changeScore = useCallback(
    async (tricksTaken: number, bonus: number, hash?: string) => {
      if (!game || !me) {
        console.log("No game or player");
        return;
      }

      setChangingGame(true);
      // Attempt to update the game score
      const result = await callGetRoute(
        GameSetScoreUri(game.id, me.id, tricksTaken, bonus, hash ?? game.hash)
      );

      if (result.status !== 200) {
        console.log("Could not set score");

        if (result.status === 409) {
          setTimeout(async () => {
            const hash = await getCurrentHash();
            changeScore(tricksTaken, bonus, hash);
          }, 1000);
        }
      }

      if (result.status !== 409) {
        setChangingGame(false);
      }
    },
    [game, me]
  );

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
    <div>
      {showOverlay && (
        <div className={`overlay`}>
          <Spinner animation="border" role="status"></Spinner>
        </div>
      )}
      <div className="playAreaContainer">
        {playerRounds.map((x, index) => (
          <div key={index} className="playerStatusCardContainer">
            <PlayerStatusCard
              isMe={x.player.id === me.id}
              playerRounds={x}
              turnPhase={game.status}
              onBidChange={
                x.player.id === me.id && game.status === GameStatus.biddingOpen
                  ? (bid) => changeBid(bid)
                  : undefined
              }
              onScoreChange={
                x.player.id === me.id &&
                game.status === GameStatus.biddingClosed
                  ? (tricksTaken, bonus) => changeScore(tricksTaken, bonus)
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
    </div>
  );
};
