import { Button, Stack } from "react-bootstrap";
import classNames from "classnames";
import { GripVertical } from "react-bootstrap-icons";
import { Game, GameDifficulty, GameStatus, Player } from "../../types/game";
import { useCallback, useEffect, useRef, useState } from "react";
import { SimpleModal } from "../../common/simple-modal";
import { TextInputArea } from "../../common/input-area/text-input-area";

import "./GameInfo.less";
import { TutorialContext } from "../../TutorialContext";

export interface GameInfoProps {
  game: Game | null;
  me: Player;
  editMyName: (name: string) => Promise<void>;
  reorderPlayers?: (playerOrder: string[]) => Promise<void>;
  startGame?: (
    randomBids: boolean,
    gameDifficulty: GameDifficulty
  ) => Promise<void>;
  onTutorialContextChanged?: (context: TutorialContext) => void;
}

export const GameInfo = (props: GameInfoProps) => {
  const {
    game,
    me,
    editMyName,
    reorderPlayers,
    startGame,
    onTutorialContextChanged,
  } = props;
  const [showEditPlayerUI, setShowEditPlayerUI] = useState<boolean>(false);
  const [myUpdatedName, setMyUpdatedName] = useState<string>();
  const [showRandomBidPopup, setShowRandomBidPopup] = useState<boolean>(false);
  const [draggedPlayerIndex, setDraggedPlayerIndex] = useState<number | null>(
    null
  );
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const lastDragUpdateRef = useRef<number>(0);

  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    setDraggedPlayerIndex(index);
    e.dataTransfer.effectAllowed = "move";
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedPlayerIndex(null);
    setDragOverIndex(null);
  }, []);

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
    if (startGame) {
      onTutorialContextChanged?.(TutorialContext.startGameOptions);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startGame]); // onTutorialContextChanged is stable (memoized) so omitted

  // Show tutorial when auto bid popup is opened
  useEffect(() => {
    if (showRandomBidPopup) {
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
          <Stack
            gap={1}
            onDragOver={(e) => {
              e.preventDefault();
              if (draggedPlayerIndex === null) {
                return;
              }

              const now = Date.now();
              // Throttle updates to every 100ms to reduce jumpiness further
              if (now - lastDragUpdateRef.current < 100) {
                return;
              }

              // Find insertion point based on mouse position
              const container = e.currentTarget as HTMLElement;
              const playerItems = container.querySelectorAll(".playerDisplay");
              const y = e.clientY;
              let newDragOverIndex: number | null = null;

              // Check each item to see where the mouse is
              for (let i = 0; i < playerItems.length; i++) {
                const rect = (
                  playerItems[i] as HTMLElement
                ).getBoundingClientRect();

                if (y >= rect.top && y <= rect.bottom) {
                  // Mouse is over this player item

                  if (i === playerItems.length - 1) {
                    // Last item - bottom half means insert after
                    const isBottomHalf = y > rect.top + rect.height / 2;
                    if (isBottomHalf) {
                      newDragOverIndex = game!.playerRoundInfo.length;
                    }
                    // Top half of last item = no insertion indicator
                  } else {
                    // Not the last item - check if we're in the bottom half (insertion zone)
                    const isBottomHalf = y > rect.top + rect.height / 2;
                    if (isBottomHalf) {
                      newDragOverIndex = i + 1; // Insert after this item
                    }
                    // Top half = no insertion indicator (would be insertion before, but we handle that in the gap)
                  }
                  break;
                }
              }

              // Check gaps between items (insertion points between items)
              if (newDragOverIndex === null) {
                for (let i = 0; i < playerItems.length - 1; i++) {
                  const currentRect = (
                    playerItems[i] as HTMLElement
                  ).getBoundingClientRect();
                  const nextRect = (
                    playerItems[i + 1] as HTMLElement
                  ).getBoundingClientRect();

                  // Gap between items i and i+1
                  if (y > currentRect.bottom && y < nextRect.top) {
                    newDragOverIndex = i + 1; // Insert between these items
                    break;
                  }
                }
              }

              // Only update state if the insertion index has actually changed
              if (newDragOverIndex !== dragOverIndex) {
                setDragOverIndex(newDragOverIndex);
                lastDragUpdateRef.current = now;
              }

              e.dataTransfer.dropEffect = "move";
            }}
            onDrop={() => {
              if (draggedPlayerIndex === null || dragOverIndex === null) {
                return;
              }

              const newOrder = [...game!.playerRoundInfo];
              const draggedPlayer = newOrder[draggedPlayerIndex];

              // Remove dragged player from current position
              newOrder.splice(draggedPlayerIndex, 1);

              // Insert at the calculated position
              let insertIndex = dragOverIndex;
              if (draggedPlayerIndex < dragOverIndex) {
                insertIndex = dragOverIndex - 1;
              }

              newOrder.splice(insertIndex, 0, draggedPlayer);

              const playerIds = newOrder.map((pri) => pri.player.id);
              if (reorderPlayers) {
                reorderPlayers(playerIds);
              }

              setDraggedPlayerIndex(null);
              setDragOverIndex(null);
            }}
          >
            {game?.playerRoundInfo.map((x, index) => {
              const isCaptain = game.playerRoundInfo[0].player.id === me.id;
              const canReorder = isCaptain && game.playerRoundInfo.length > 2;
              const isFirstPlayer = index === 0;
              const showInsertionBefore =
                dragOverIndex === index && draggedPlayerIndex !== null;

              return (
                <div key={x.player.id}>
                  {/* Always render insertion line to reserve space and prevent height changes */}
                  <div
                    className={classNames("insertionIndicator", {
                      active: showInsertionBefore,
                    })}
                  />

                  <div
                    className={classNames("playerDisplay", {
                      "can-drag": !isFirstPlayer && canReorder,
                      "is-dragging": draggedPlayerIndex === index,
                    })}
                    draggable={!isFirstPlayer && canReorder}
                    onDragStart={(e) => {
                      handleDragStart(e, index);
                    }}
                    onDragEnd={handleDragEnd}
                  >
                    {/* Grabber space only for Captain */}
                    {canReorder && (
                      <div className="playerGrabber">
                        {!isFirstPlayer && (
                          <GripVertical size={16} className="playerGripIcon" />
                        )}
                      </div>
                    )}
                    <span className="playerName">{x.player.name}</span>
                    <div className="playerActions">
                      {me.id === x.player.id && (
                        <Button
                          variant="link"
                          className="textLink"
                          onClick={() => setShowEditPlayerUI(true)}
                        >
                          edit
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {/* Always render end-of-list insertion indicator to reserve space */}
            <div
              className={classNames("insertionIndicator", {
                active:
                  dragOverIndex === game?.playerRoundInfo.length &&
                  draggedPlayerIndex !== null,
              })}
            />
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
