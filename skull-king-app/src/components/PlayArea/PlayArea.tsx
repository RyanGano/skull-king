import classNames from "classnames";
import { type Game, GameStatus, type Player } from "../../types/game";
import { PlayerStatusCard } from "../PlayerStatusCard/PlayerStatusCard";
import { calculateRoundScore } from "../PlayerStatusCard/utils";

import "./PlayArea.less";
import { GameSetBidUri, GameSetScoreUri } from "../../service-paths";
import { callGetRoute } from "../../utils/api-utils";
import { useCallback, useEffect, useState } from "react";
import { Spinner } from "react-bootstrap";
import { TutorialContext } from "../../TutorialContext";

// A change the service rejects as out of date is worth retrying with fresh
// data, but not forever - an endless retry leaves the spinner up for good.
const MAX_STALE_RETRIES = 5;

interface PlayAreaProps {
  game: Game;
  me: Player;
  moveToNextGameStatus: (hash?: string) => Promise<void>;
  moveToPreviousGameStatus: (hash?: string) => Promise<void>;
  gameChanging: boolean;
  getCurrentHash: () => Promise<string | undefined>;
  onChangeFailed?: () => void;
  showRestartButtons?: boolean;
  onRestartGame?: () => Promise<void>;
  onTutorialContextChanged?: (context: TutorialContext) => void;
}

export const PlayArea = (props: PlayAreaProps) => {
  const {
    game,
    me,
    moveToNextGameStatus,
    moveToPreviousGameStatus,
    gameChanging,
    getCurrentHash,
    onChangeFailed,
    showRestartButtons,
    onRestartGame,
    onTutorialContextChanged,
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
    async (playerId: string, bid: number, hash?: string, attempt = 0) => {
      if (!game) {
        console.log("No game");
        return;
      }

      setChangingGame(true);
      // Attempt to update the bid
      const result = await callGetRoute(
        GameSetBidUri(game.id, playerId, bid, hash ?? game.hash),
      );

      if (result.status === 200) {
        setChangingGame(false);
        return;
      }

      console.log("Could not set bid", result.status);

      if (result.status === 409 && attempt < MAX_STALE_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        const currentHash = await getCurrentHash();
        await changeBid(playerId, bid, currentHash, attempt + 1);
        return;
      }

      setChangingGame(false);
      onChangeFailed?.();
    },
    [game, getCurrentHash, onChangeFailed],
  );

  const changeScore = useCallback(
    async (
      playerId: string,
      tricksTaken: number,
      bonus: number,
      hash?: string,
      attempt = 0,
    ) => {
      if (!game) {
        console.log("No game");
        return;
      }

      setChangingGame(true);
      // Attempt to update the game score
      const result = await callGetRoute(
        GameSetScoreUri(
          game.id,
          playerId,
          tricksTaken,
          bonus,
          hash ?? game.hash,
        ),
      );

      if (result.status === 200) {
        setChangingGame(false);
        return;
      }

      console.log("Could not set score", result.status);

      if (result.status === 409 && attempt < MAX_STALE_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        const currentHash = await getCurrentHash();
        await changeScore(playerId, tricksTaken, bonus, currentHash, attempt + 1);
        return;
      }

      setChangingGame(false);
      onChangeFailed?.();
    },
    [game, getCurrentHash, onChangeFailed],
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

  const getMyPlace = (game: Game, playerId: string) => {
    if (game.status !== GameStatus.gameOver) {
      return undefined;
    }

    const playerScores = game.playerRoundInfo
      .map((x) => ({
        id: x.player.id,
        score: x.rounds
          .map((x) => calculateRoundScore(x))
          .reduce((a, b) => a + b, 0),
      }))
      .sort((a, b) => b.score - a.score);

    // build a list of the numbers 1, 2, 3, [4 - 8 in random order]
    const imagePositions = [
      1,
      2,
      3,
      ...[4, 5, 6, 7, 8].sort(() => Math.random() - 0.5),
    ];

    const playerPosition = playerScores.findIndex((x) => x.id === playerId);
    return imagePositions[playerPosition];
  };

  // Put the current player at the top of the list so they always
  // know to look for their name. Other players should be in the
  // same order on all devices, but if not, it's OK.
  const playerRounds =
    [...game.playerRoundInfo].sort((a) => (a.player.id === me.id ? -1 : 0)) ??
    [];

  const iAmCaptain = game.playerRoundInfo[0].player.id === me.id;
  const isGhostPlayer = (player: { name: string }) =>
    player.name === "Ghost Player";

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
              myPlace={getMyPlace(game, x.player.id)}
              playerRounds={x}
              expansionEnabled={game.expansionEnabled}
              turnPhase={game.status}
              onBidChange={
                (x.player.id === me.id || iAmCaptain) &&
                !isGhostPlayer(x.player) &&
                game.status === GameStatus.biddingOpen
                  ? (bid) => changeBid(x.player.id, bid)
                  : undefined
              }
              onScoreChange={
                (x.player.id === me.id || iAmCaptain) &&
                !isGhostPlayer(x.player) &&
                game.status === GameStatus.biddingClosed
                  ? (tricksTaken, bonus) =>
                      changeScore(x.player.id, tricksTaken, bonus)
                  : undefined
              }
              dealer={x.player.id === dealerId}
              onTutorialContextChanged={onTutorialContextChanged}
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
        <div
          className={classNames("gameStatusNavButton", {
            ["previous"]: true,
            ["disabled"]: !(
              game.playerRoundInfo[0].rounds.length > 1 ||
              game.status === GameStatus.biddingClosed
            ),
            ["hidden"]: !iAmCaptain,
          })}
          onClick={() =>
            game.playerRoundInfo[0].rounds.length > 1 ||
            game.status === GameStatus.biddingClosed
              ? moveToPreviousGameStatus()
              : null
          }
        />
        <span className="gameStatusText">{gameState}</span>
        <div
          className={classNames("gameStatusNavButton", {
            ["next"]: true,
            ["disabled"]: !(game.status !== GameStatus.gameOver),
            ["hidden"]: !iAmCaptain,
          })}
          onClick={() =>
            game.status !== GameStatus.gameOver ? moveToNextGameStatus() : null
          }
        />
      </div>
      {showRestartButtons &&
        game.status === GameStatus.gameOver &&
        iAmCaptain && (
          <div className="restartButtonsContainer">
            <button
              className="restartButton restartGameButton"
              onClick={onRestartGame}
            >
              Begin a fresh voyage!
            </button>
          </div>
        )}
    </div>
  );
};
