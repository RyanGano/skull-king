import { Button, Stack } from "react-bootstrap";
import classNames from "classnames";
import { Game, GameDifficulty, GameStatus, Player } from "../../types/game";
import { useCallback, useEffect, useState } from "react";
import { SimpleModal } from "../../common/simple-modal";
import { TextInputArea } from "../../common/input-area/text-input-area";

import "./GameInfo.less";
import { TutorialContext } from "../../TutorialContext";

export interface GameInfoProps {
  game: Game | null;
  me: Player;
  editMyName: (name: string) => Promise<void>;
  startGame?: (
    randomBids: boolean,
    gameDifficulty: GameDifficulty
  ) => Promise<void>;
  onTutorialContextChanged?: (context: TutorialContext) => void;
}

export const GameInfo = (props: GameInfoProps) => {
  const { game, me, editMyName, startGame, onTutorialContextChanged } = props;
  const [showEditPlayerUI, setShowEditPlayerUI] = useState<boolean>(false);
  const [myUpdatedName, setMyUpdatedName] = useState<string>();
  const [showRandomBidPopup, setShowRandomBidPopup] = useState<boolean>(false);

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

      const difficultyClass =
        buttonDifficulty == GameDifficulty.Easy
          ? "easy-button"
          : buttonDifficulty == GameDifficulty.Medium
          ? "medium-button"
          : "hard-button";

      return (
        <div
          key={difficultyTitle}
          className={classNames("numberDisplayBackground", difficultyClass)}
          onClick={() => {
            startGame!(true, buttonDifficulty);
            setShowRandomBidPopup(false);
            // Close the tutorial since the user has completed the auto-bid setup
            onTutorialContextChanged?.(TutorialContext.inGame);
          }}
        >
          <div className="numberDisplayContainer">{difficultyTitle}</div>
        </div>
      );
    },
    [startGame, onTutorialContextChanged]
  );

  // Show tutorial when startGame buttons are available (user can start the game)
  useEffect(() => {
    console.log("GameInfo: startGame prop changed:", !!startGame);
    if (startGame) {
      console.log(
        "GameInfo: Calling onTutorialContextChanged with startGameOptions"
      );
      onTutorialContextChanged?.(TutorialContext.startGameOptions);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startGame]); // onTutorialContextChanged is stable (memoized) so omitted

  // Show tutorial when auto bid popup is opened
  useEffect(() => {
    if (showRandomBidPopup) {
      console.log(
        "GameInfo: Calling onTutorialContextChanged with startingAutoBid"
      );
      onTutorialContextChanged?.(TutorialContext.startingAutoBid);
    }
  }, [showRandomBidPopup, onTutorialContextChanged]);

  const getRandomBidStartUI = () => {
    const buttons = [
      getDifficultyButton(GameDifficulty.Easy),
      getDifficultyButton(GameDifficulty.Medium),
      getDifficultyButton(GameDifficulty.Hard),
    ];

    return (
      <Stack>
        <span>
          Arrr! In this mode, the system draws yer bids from a hat, ye scurvy
          dogs! Focus on playin' yer cards wisely to match whatever lot ye've
          drawn. Faster games, wilder laughs, and sometimes ye'll be chasin' the
          Kraken with naught but bilge rats in yer hand! Two players? We'll add
          a ghost mate fer ye - no scorin' needed fer that phantom swab.
        </span>
        <p>Choose yer difficulty</p>
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
          defaultButtonContent={"Cancel"}
          onAccept={() => setShowRandomBidPopup(false)}
          onCancel={() => setShowRandomBidPopup(false)}
          show={showRandomBidPopup}
        />
      )}
      {game?.status === GameStatus.acceptingPlayers && (
        <span className="gameIdDisplay">Game ID: {game?.id}</span>
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
          className="buttonStyle start-game-button"
          onClick={() => startGame(false, GameDifficulty.Easy)}
        >
          Start Game
        </Button>
      )}
      {startGame && (
        <Button
          className="buttonStyle auto-bid-button"
          onClick={() => setShowRandomBidPopup(true)}
        >
          Start Game with Auto Bid
        </Button>
      )}
    </Stack>
  );
};
