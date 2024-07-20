import {
  CaretLeftSquareFill,
  CaretRightSquareFill,
} from "react-bootstrap-icons";
import { Game, GameStatus, PlayerRounds } from "../../types/game";
import { PlayerStatusCard } from "../PlayerStatusCard/PlayerStatusCard";

export const defaultBlueColor = "#DDDDFF";
export const defaultGreenColor = "#DDFFDD";
export const enabledButtonColor = "#AAAAFF";
export const disabledButtonColor = "#CCCCCC";

interface PlayAreaProps {
  game: Game;
  moveToNextGameStatus: () => void;
  moveToPreviousGameStatus: () => void;
}

export const PlayArea = (props: PlayAreaProps) => {
  const { game, moveToNextGameStatus, moveToPreviousGameStatus } = props;

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

  const playerStates: PlayerRounds[] = game.players.map((x) => ({
    player: x,
    rounds: game.roundInfos.flatMap((y) =>
      y.playerRounds.filter((z) => z.player.id === x.id).map((z) => z.round)
    ),
  }));

  return (
    <>
      <div className={"d-flex flex-wrap"}>
        {playerStates.map((x, index) => (
          <div style={{ flexGrow: 1 }}>
            <PlayerStatusCard
              key={x.player.name}
              playerRounds={x}
              turnPhase={game.status}
              onBidChange={(newValue) => console.log("onBidChange", newValue)}
              onScoreChange={(newValue) =>
                console.log("onScoreChange", newValue)
              }
              dealer={
                ((game.roundInfos.length ?? 0) - 1) % game.players.length ===
                index
              }
            />
          </div>
        ))}

        {game.players.length % 2 === 1 && <div style={{ flex: "0 0 50%" }} />}
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          margin: 6,
        }}
      >
        <CaretLeftSquareFill
          color={
            game.roundInfos.length > 1 ||
            game.status === GameStatus.biddingClosed
              ? enabledButtonColor
              : disabledButtonColor
          }
          size={36}
          onClick={() =>
            game.roundInfos.length > 1 ||
            game.status === GameStatus.biddingClosed
              ? moveToPreviousGameStatus()
              : null
          }
        />
        <span style={{ fontWeight: 600 }}>{gameState}</span>
        <CaretRightSquareFill
          color={
            game.status !== GameStatus.gameOver
              ? enabledButtonColor
              : disabledButtonColor
          }
          size={36}
          onClick={() =>
            game.status !== GameStatus.gameOver ? moveToNextGameStatus() : null
          }
        />
      </div>
    </>
  );
};
