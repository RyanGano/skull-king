import { Button, Stack } from "react-bootstrap";
import classNames from "classnames";
import { Game, GameDifficulty, GameStatus, Player } from "../../types/game";
import { useCallback, useState } from "react";
import { SimpleModal } from "../../common/simple-modal";
import { TextInputArea } from "../../common/input-area/text-input-area";

import "./GameInfo.less";

export interface GameInfoProps {
  game: Game | null;
  me: Player;
  editMyName: (name: string) => void;
  startGame?: (randomBids: boolean, gameDifficulty: GameDifficulty) => void;
}

export const GameInfo = (props: GameInfoProps) => {
  const { game, me, editMyName, startGame } = props;
  const [showEditPlayerUI, setShowEditPlayerUI] = useState<boolean>(false);
  const [myUpdatedName, setMyUpdatedName] = useState<string>();
  const [showRandomBidPopup, setShowRandomBidPopup] = useState<boolean>(false);
  const [difficulty, setDifficulty] = useState<GameDifficulty>();

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

  const getDifficultyButton = useCallback(
    (buttonDifficulty: GameDifficulty) => {
      const difficultyTitle =
        buttonDifficulty == GameDifficulty.Easy
          ? "Easy"
          : buttonDifficulty == GameDifficulty.Medium
          ? "Medium"
          : "Hard";

      return (
        <div
          key={difficultyTitle}
          className={classNames("numberDisplayBackground", {
            ["selected"]: difficulty === buttonDifficulty,
          })}
          onClick={() => {
            setDifficulty(buttonDifficulty);
          }}
        >
          <div className="numberDisplayContainer">{difficultyTitle}</div>
        </div>
      );
    },
    [difficulty]
  );

  const getRandomBidStartUI = () => {
    const buttons = [
      getDifficultyButton(GameDifficulty.Easy),
      getDifficultyButton(GameDifficulty.Medium),
      getDifficultyButton(GameDifficulty.Hard),
    ];

    return (
      <Stack>
        <span>
          Random Bid Game: A game where the site picks a bid for each player. It
          is then each player's goal to match the bid with the cards they have.
          This will likely be a faster version of the game because you're not
          focusing on what to bid, but how to get your bid. It can also be a
          funny version of the game as a player may find that they are supposed
          to take six out of seven tricks with only low cards. If you're playing
          with only two players, a third "Ghost Player" will be added for you.
          Don't worry about updating the score for this player.
        </span>
        <p>Choose your difficulty</p>
        <div className="wrappingContainer">{buttons}</div>
      </Stack>
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
      {showRandomBidPopup && !!startGame && (
        <SimpleModal
          title={"Auto (Random) Bid"}
          content={getRandomBidStartUI()}
          defaultButtonContent={"Start"}
          alternateButtonContent={"Cancel"}
          onAccept={() => {
            startGame(true, difficulty ?? GameDifficulty.Easy);
            setShowRandomBidPopup(false);
          }}
          onCancel={() => setShowRandomBidPopup(false)}
          show={showRandomBidPopup}
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
        <Button
          className="buttonStyle"
          onClick={() => startGame(false, GameDifficulty.Easy)}
        >
          Start Game
        </Button>
      )}
      {startGame && (
        <Button
          className="buttonStyle"
          onClick={() => setShowRandomBidPopup(true)}
        >
          Start Game with Auto Bid
        </Button>
      )}
    </Stack>
  );
};
