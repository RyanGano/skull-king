import { useCallback, useEffect, useRef, useState } from "react";
import { SimpleModal } from "../../common/simple-modal";
import { Stack } from "react-bootstrap";
import { TextInputArea } from "../../common/input-area/text-input-area";

import "./GameSetup.less";
import { callGetRoute } from "../../utils/api-utils";
import { GameGetSingleGameIdUri, GetGameUri } from "../../service-paths";
import { GameStatus } from "../../types/game";
import { TutorialContext } from "../../TutorialContext";

interface GameSetupProps {
  createGame?: (
    playerName: string,
    expansionEnabled?: boolean,
  ) => Promise<void>;
  joinGame?: (gameId: string, playerName: string) => Promise<void>;
  defaultGameId?: string;
  playerId?: string;
  onSetupModalChanged?: (open: boolean) => void;
  onTutorialContextChanged?: (
    context:
      | TutorialContext.home
      | TutorialContext.createGame
      | TutorialContext.joinGame,
  ) => void;
  showTutorial?: boolean;
}

export const GameSetup = (props: GameSetupProps) => {
  const {
    createGame,
    joinGame,
    defaultGameId,
    playerId,
    onSetupModalChanged,
    onTutorialContextChanged,
    showTutorial = false,
  } = props;
  const [showCreateGameUI, setShowCreateGameUI] = useState<boolean>(false);
  const [showJoinGameUI, setShowJoinGameUI] = useState<boolean>(false);
  const [showGameNotFoundUI, setShowGameNotFoundUI] = useState<boolean>(false);
  const [showGameCannotJoinUI, setShowGameCannotJoinUI] =
    useState<boolean>(false);
  const [gameId, setGameId] = useState<string | undefined>();
  const [ignoreDefaultGameId, setIgnoreDefaultGameId] =
    useState<boolean>(false);
  const [userEnteredGameId, setUserEnteredGameId] = useState<
    string | undefined
  >();
  const [joinError, setJoinError] = useState<string | undefined>();
  const [playerName, setPlayerName] = useState<string | undefined>();
  const [expansionEnabled, setExpansionEnabled] = useState<boolean>(false);
  const lastCheckedPathRef = useRef<string | null>(null);

  const checkForId = useCallback(async () => {
    const result = await callGetRoute(GameGetSingleGameIdUri());
    if (result.status === 200) {
      setGameId(result.data);
    }
  }, []);

  // only depend on the specific callback prop to avoid recreating this
  const notifySetupChanged = useCallback(
    (open: boolean) => {
      onSetupModalChanged?.(open);
    },
    [onSetupModalChanged],
  );

  const openCreateUI = useCallback(() => {
    setShowCreateGameUI(true);
    notifySetupChanged(true);
    onTutorialContextChanged?.(TutorialContext.createGame);
  }, [notifySetupChanged, onTutorialContextChanged]);

  const closeCreateUI = useCallback(() => {
    setShowCreateGameUI(false);
    notifySetupChanged(false);
  }, [notifySetupChanged]);

  const openJoinUI = useCallback(() => {
    setShowJoinGameUI(true);
    notifySetupChanged(true);
    onTutorialContextChanged?.(TutorialContext.joinGame);
    if (!defaultGameId) {
      checkForId();
    }
  }, [notifySetupChanged, onTutorialContextChanged, defaultGameId, checkForId]);

  const closeJoinUI = useCallback(() => {
    setShowJoinGameUI(false);
    setShowGameNotFoundUI(false);
    setShowGameCannotJoinUI(false);
    // clear game id after closing so subsequent opens behave normally
    setGameId(undefined);
    setIgnoreDefaultGameId(false);
    setUserEnteredGameId(undefined);
    setJoinError(undefined);
    notifySetupChanged(false);
  }, [notifySetupChanged]);

  const validateAndJoinGame = useCallback(
    async (gameId: string, playerName: string) => {
      // Clear any previous error
      setJoinError(undefined);
      try {
        const result = await callGetRoute(GetGameUri(gameId));
        if (result.status === 200) {
          const gameData = result.data;
          if (gameData.status === GameStatus.acceptingPlayers) {
            // Game exists and can be joined - proceed with join
            setUserEnteredGameId(undefined);
            setIgnoreDefaultGameId(false);
            await joinGame?.(gameId, playerName);
            closeJoinUI();
          } else {
            // Game exists but cannot be joined
            setJoinError(
              "This game is already in progress and cannot be joined.",
            );
          }
        } else {
          // Game doesn't exist
          setJoinError("Game not found. Please check the game ID.");
        }
      } catch (error) {
        // Error loading game
        setJoinError("Unable to check game status. Please try again.");
      }
    },
    [joinGame, closeJoinUI],
  );

  // Prefill game id when defaultGameId is provided and no playerId (meaning user needs to join)
  useEffect(() => {
    const validateAndShowGame = async () => {
      if (
        defaultGameId &&
        !playerId &&
        defaultGameId !== lastCheckedPathRef.current
      ) {
        lastCheckedPathRef.current = defaultGameId;

        try {
          const result = await callGetRoute(GetGameUri(defaultGameId));
          if (result.status === 200) {
            const gameData = result.data;
            if (gameData.status === GameStatus.acceptingPlayers) {
              // Game exists and can be joined
              setGameId(defaultGameId);
              setShowJoinGameUI(true);
              notifySetupChanged(true);
            } else {
              // Game exists but cannot be joined
              setGameId(defaultGameId);
              setShowGameCannotJoinUI(true);
              notifySetupChanged(true);
            }
          } else {
            // Game doesn't exist
            setGameId(defaultGameId);
            setShowGameNotFoundUI(true);
            notifySetupChanged(true);
          }
        } catch (error) {
          // Error loading game
          setGameId(defaultGameId);
          setShowGameNotFoundUI(true);
          notifySetupChanged(true);
        }
      }
    };

    validateAndShowGame();
  }, [defaultGameId, playerId, notifySetupChanged]);

  // create UI
  const getCreateGameUI = () => {
    return (
      <div>
        <TextInputArea
          startingValue={playerName}
          setNewValue={(newValue) => setPlayerName(newValue)}
          placeholder="Enter your name"
          onEnter={(entered) => {
            const name = entered ?? playerName;
            if (name && name.length) {
              createGame?.(name, expansionEnabled);
              setShowCreateGameUI(false);
            }
          }}
          isValid={(playerName?.length ?? 0) > 0}
          autoFocus={true}
        />

        <div style={{ marginTop: "0.75rem" }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="checkbox"
              checked={expansionEnabled}
              onChange={(e) => setExpansionEnabled(e.target.checked)}
            />
            <span>Include expansion</span>
          </label>
        </div>
      </div>
    );
  };

  // join UI: Game Id field (auto uppercase) then name field. If gameId is pre-populated,
  // we display it as non-editable; otherwise, show input for gameId.
  const getJoinGameUI = () => {
    const displayGameId = ignoreDefaultGameId
      ? gameId
      : (defaultGameId ?? gameId);
    return (
      <Stack gap={2}>
        {joinError && <div className="joinError">{joinError}</div>}
        {gameId ? (
          <div
            className="gameIdDisplay"
            style={{ fontSize: "1.2rem", color: "#000", padding: "0.375rem 0" }}
          >
            Game ID: {displayGameId}
          </div>
        ) : (
          <TextInputArea
            startingValue={userEnteredGameId}
            setNewValue={(newValue) => setUserEnteredGameId(newValue)}
            placeholder="Game Id"
            inputFormatter={(textWithSelection) => ({
              ...textWithSelection,
              value: textWithSelection.value.toUpperCase(),
            })}
            onEnter={(entered) => {
              const gid = (entered ?? userEnteredGameId) as string | undefined;
              // if gid and name present, join
              if ((gid?.length ?? 0) === 4 && (playerName?.length ?? 0) > 0) {
                validateAndJoinGame(gid!, playerName!);
              }
            }}
            isValid={(userEnteredGameId?.length ?? 0) === 4}
            autoFocus={true}
          />
        )}

        <TextInputArea
          startingValue={playerName}
          setNewValue={(newValue) => setPlayerName(newValue)}
          placeholder="Enter your name"
          onEnter={(entered) => {
            const name = entered ?? playerName;
            const gid = displayGameId ?? userEnteredGameId;
            if ((gid?.length ?? 0) === 4 && (name?.length ?? 0) > 0) {
              validateAndJoinGame(gid!, name!);
            }
          }}
          isValid={(playerName?.length ?? 0) > 0}
          // if gameId is displayed, focus name
          autoFocus={!!displayGameId}
        />
      </Stack>
    );
  };

  // Game not found UI
  const getGameNotFoundUI = () => {
    return (
      <div style={{ textAlign: "center", padding: "1rem" }}>
        <p style={{ fontSize: "1.4rem", color: "#8B4513", fontWeight: "bold" }}>
          Shiver me timbers! This game be lost to the depths!
        </p>
        <p
          style={{ fontSize: "1.1rem", color: "#654321", marginTop: "0.5rem" }}
        >
          No game with that code exists, ye landlubber!
        </p>
      </div>
    );
  };

  // Game cannot be joined UI
  const getGameCannotJoinUI = () => {
    return (
      <div style={{ textAlign: "center", padding: "1rem" }}>
        <p style={{ fontSize: "1.4rem", color: "#8B4513", fontWeight: "bold" }}>
          Arrr! This game be already underway, ye scurvy dog!
        </p>
        <p
          style={{ fontSize: "1.1rem", color: "#654321", marginTop: "0.5rem" }}
        >
          The battle has begun or ended - find another crew!
        </p>
      </div>
    );
  };

  return (
    <>
      <Stack gap={2}>
        {showCreateGameUI && (
          <SimpleModal
            title={"New Game"}
            content={getCreateGameUI()}
            defaultButtonContent={"Start"}
            onAccept={() => {
              if (playerName) createGame?.(playerName, expansionEnabled);
              closeCreateUI();
            }}
            onCancel={() => closeCreateUI()}
            allowAccept={!!playerName}
            show={true}
            centered={false}
            fullScreen={false}
            backdrop={showTutorial ? false : true}
          />
        )}

        {showJoinGameUI && (
          <SimpleModal
            title={"Join Game"}
            content={getJoinGameUI()}
            defaultButtonContent={"Join"}
            onAccept={() => {
              const gid = gameId ?? userEnteredGameId ?? defaultGameId;
              if (!gid || !playerName) return;
              validateAndJoinGame(gid, playerName!);
            }}
            onCancel={() => {
              closeJoinUI();
              window.location.href = "/";
            }}
            allowAccept={
              !!playerName &&
              (gameId ?? userEnteredGameId ?? defaultGameId)?.length === 4
            }
            show={true}
            centered={false}
            fullScreen={false}
            backdrop={showTutorial ? false : true}
          />
        )}

        {showGameNotFoundUI && (
          <SimpleModal
            title={"Lost at Sea!"}
            content={getGameNotFoundUI()}
            defaultButtonContent={"Back to Port"}
            onAccept={() => {
              setShowGameNotFoundUI(false);
              setGameId(undefined);
              // Navigate to root
              window.location.href = "/";
            }}
            allowAccept={true}
            show={true}
            centered={false}
            fullScreen={false}
            backdrop={showTutorial ? false : true}
            onCancel={() => {
              setShowGameCannotJoinUI(false);
              setGameId(undefined);
              // Navigate to root
              window.location.href = "/";
            }}
          />
        )}

        {showGameCannotJoinUI && (
          <SimpleModal
            title={"Cannot Join Game"}
            content={getGameCannotJoinUI()}
            defaultButtonContent={"Try Another Game"}
            alternateButtonContent={"Back to Port"}
            onAccept={() => {
              setShowGameCannotJoinUI(false);
              setGameId(undefined);
              setIgnoreDefaultGameId(true);
              setShowJoinGameUI(true);
            }}
            onCancel={() => {
              setShowGameCannotJoinUI(false);
              setGameId(undefined);
              // Navigate to root
              window.location.href = "/";
            }}
            allowAccept={true}
            show={true}
            centered={false}
            fullScreen={false}
            backdrop={showTutorial ? false : true}
          />
        )}

        {joinGame && (
          <div className="gameSetupContainer">
            <div className="imageContainer">
              <img
                src="/images/banner.png"
                alt="Start or join a battle!"
                className="bannerImage"
              />

              <div className="buttonsContainer">
                {createGame && (
                  <div
                    className="gameButton"
                    onClick={() => openCreateUI()}
                  ></div>
                )}
                <div className="gameButton" onClick={() => openJoinUI()}></div>
              </div>
            </div>
          </div>
        )}
      </Stack>
    </>
  );
};
