import { Button, Stack } from "react-bootstrap";
import { Game, GameStatus, Player } from "../../types/game";
import { useState } from "react";
import { SimpleModal } from "../../common/simple-modal";
import { TextInputArea } from "../../common/input-area/text-input-area";

import "./GameInfo.less";

export interface GameInfoProps {
  game: Game | null;
  me: Player;
  editMyName: (name: string) => void;
  startGame?: (randomBids: boolean) => void;
}

export const GameInfo = (props: GameInfoProps) => {
  const { game, me, editMyName, startGame } = props;
  const [showEditPlayerUI, setShowEditPlayerUI] = useState<boolean>(false);
  const [myUpdatedName, setMyUpdatedName] = useState<string>();

  const getEditPlayerNameUI = () => {
    return (
      <TextInputArea
        startingValue={me.name}
        setNewValue={(newValue) => setMyUpdatedName(newValue)}
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
      {game?.status === GameStatus.acceptingPlayers && (
        <span>Game ID: {game?.id}</span>
      )}
      {game?.status === GameStatus.acceptingPlayers && (
        <Stack direction="horizontal" gap={3} className="playerList">
          <>Players:</>
          <Stack gap={2}>
            {game?.playerRoundInfo.map((x) => (
              <div key={x.player.id} className="playerDisplay">
                {x.player.name}
                {me.id === x.player.id ? (
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
      {startGame && (
        <Button className="buttonStyle" onClick={() => startGame(false)}>
          Start Game
        </Button>
      )}
      {startGame && (
        <Button className="buttonStyle" onClick={() => startGame(true)}>
          Start Random Bid Game
        </Button>
      )}
    </Stack>
  );
};
