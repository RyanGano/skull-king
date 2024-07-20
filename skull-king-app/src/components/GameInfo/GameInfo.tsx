import { Button, Stack } from "react-bootstrap";
import { Game, GameStatus, Player } from "../../types/game";
import { useState } from "react";
import { SimpleModal } from "../../common/simple-modal";
import { TextInputArea } from "../../common/input-area/text-input-area";

export interface GameInfoProps {
  game: Game | null;
  me: Player;
  editMyName: (name: string) => void;
  startGame?: () => void;
}

export const GameInfo = (props: GameInfoProps) => {
  const { game, me, editMyName, startGame } = props;
  const [showEditPlayerUI, setShowEditPlayerUI] = useState<boolean>(false);
  const [myUpdatedName, setMyUpdatedName] = useState<string>();

  const mapGameStatus = (status?: GameStatus) => {
    switch (status) {
      case GameStatus.acceptingPlayers:
        return "Accepting Players";
      case GameStatus.biddingOpen:
        return "Bidding Open";
      case GameStatus.biddingClosed:
        return "Bidding Closed";
      case GameStatus.gameOver:
        return "Game Over";
      default:
        return "";
    }
  };

  const getEditPlayerNameUI = () => {
    return (
      <TextInputArea
        startingValue={me.name}
        setNewValue={(newValue) => setMyUpdatedName(newValue)}
        width={"150"}
        placeholder="Enter your name"
        onEnter={() => {
          editMyName(myUpdatedName!);
          setShowEditPlayerUI(false);
        }}
        isValid={(myUpdatedName?.length ?? 0) > 0}
        autoFocus={true}
      />
    );
  };

  return (
    <Stack gap={2}>
      {showEditPlayerUI && (
        <SimpleModal
          title={"Edit Player Name"}
          content={getEditPlayerNameUI()}
          defaultButtonContent={"Save"}
          onAccept={() => editMyName(myUpdatedName!)}
          onCancel={() => setShowEditPlayerUI(false)}
          allowAccept={!!myUpdatedName}
          show={true}
        />
      )}
      {game && <span>Game ID: {game?.id}</span>}
      {game && <span>Game Status: {mapGameStatus(game?.status)}</span>}
      {game && (
        <Stack
          direction="horizontal"
          gap={3}
          style={{ display: "flex", alignItems: "flex-start" }}
        >
          <>Players:</>
          <Stack gap={2}>
            {game?.players?.map((x) => (
              <div
                key={x.id}
                style={{ display: "flex", alignItems: "baseline" }}
              >
                {x.name}
                {me.id === x.id ? (
                  <Button
                    variant="link"
                    className={"textLink"}
                    onClick={() => setShowEditPlayerUI(true)}
                  >
                    edit
                  </Button>
                ) : (
                  ""
                )}
              </div>
            ))}
          </Stack>
        </Stack>
      )}
      {startGame && <Button onClick={startGame}>Start Game</Button>}
    </Stack>
  );
};
