import "bootstrap/dist/css/bootstrap.min.css";
import Stack from "react-bootstrap/esm/Stack";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useLayoutEffect,
} from "react";
import { useNavigate, useParams } from "react-router-dom";
import { QuestionCircle } from "react-bootstrap-icons";
import {
  callGetRoute,
  callPostRoute,
  callPutRoute,
  callDeleteRoute,
} from "./utils/api-utils";
import { getCookie, setCookie } from "./utils/cookie-utils";
import { useWakeLock } from "./utils/use-wake-lock";
import {
  AddPlayerUri,
  CreateNewGameUri,
  EditPlayerUri,
  GameMoveNextPhaseUri,
  GameMovePreviousPhaseUri,
  GameReorderPlayersUri,
  GameResetUri,
  GetGameUri,
  GetWarmupUri,
  RemovePlayerUri,
  StartGameUri,
} from "./service-paths";
import { Game, GameDifficulty, GameStatus, Player } from "./types/game";
import { PlayArea } from "./components/PlayArea";
import { GameInfo } from "./components/GameInfo";
import { GameSetup } from "./components/GameSetup";
import { SimpleModal } from "./common/simple-modal";
import { Tutorial } from "./components/Tutorial";
import classNames from "classnames";
import { NavLink } from "react-bootstrap";
import { Button } from "react-bootstrap";
import { TutorialContext } from "./TutorialContext";

// How many consecutive 404 polls to tolerate before declaring the game lost,
// so a transient blip (e.g. the backend restarting) doesn't end the session
const MAX_CONSECUTIVE_404S = 5;

type GameLostReason = "gameGone" | "playerRemoved";

const App = () => {
  const navigate = useNavigate();
  const { gameId: urlGameId, playerId: urlPlayerId } = useParams<{
    gameId?: string;
    playerId?: string;
  }>();
  const [game, setGame] = useState<Game | null>(null);
  const [me, setMe] = useState<Player>();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentHashRef = useRef<string | undefined>();
  const consecutive404sRef = useRef(0);
  const [showExitPopup, setShowExitPopup] = useState(false);
  const [showCaptainCannotLeavePopup, setShowCaptainCannotLeavePopup] =
    useState(false);
  const [gameChanging, setChangingGame] = useState(false);
  const [hasWarmedUp, setHasWarmedUp] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);
  const [showGameEndedMessage, setShowGameEndedMessage] = useState(false);
  const [gameLostReason, setGameLostReason] =
    useState<GameLostReason>("gameGone");
  const [gameEndedAt, setGameEndedAt] = useState<Date | null>(null);
  const [showRestartButtons, setShowRestartButtons] = useState(false);
  // Controls whether tutorial content is currently visible on screen
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialContext, setTutorialContext] = useState<TutorialContext>(
    TutorialContext.home,
  );
  // Global setting that controls whether tutorial mode is enabled (affects auto-showing tutorials)
  const [tutorialMode, setTutorialMode] = useState(false);
  const [seenTutorialContexts, setSeenTutorialContexts] = useState<
    Set<TutorialContext>
  >(new Set());
  const [showTutorialPrompt, setShowTutorialPrompt] = useState(false);
  const footerRef = useRef<HTMLDivElement>(null);

  // Keep the screen awake while a game is underway so the phone keeps polling
  useWakeLock(!!game && game.status !== GameStatus.gameOver);

  useEffect(() => {
    if (hasWarmedUp) {
      return;
    }

    const warmUp = async () => {
      const result = await callGetRoute(GetWarmupUri());
      if (result.status === 200) {
        setHasWarmedUp(true);
        console.log("Warmed up.");
      }
    };

    warmUp();
  }, [hasWarmedUp]);

  // Check if user has seen the tutorial prompt on app load
  useEffect(() => {
    if (hasWarmedUp) {
      const hasSeenTutorialPrompt = getCookie("skullKingTutorialPromptSeen");
      if (!hasSeenTutorialPrompt) {
        setShowTutorialPrompt(true);
      }
    }
  }, [hasWarmedUp]);

  useEffect(() => {
    currentHashRef.current = game?.hash;
  }, [game?.hash]);

  useEffect(() => {
    if (gameEndedAt && game?.status === GameStatus.gameOver) {
      const timer = setTimeout(() => {
        setShowRestartButtons(true);
      }, 2500);
      return () => clearTimeout(timer);
    } else {
      setShowRestartButtons(false);
    }
  }, [gameEndedAt, game?.status]);

  useEffect(() => {
    if (setupOpen && showTutorial) {
      // When setup modal opens and tutorial is active, determine context
      // This logic would need to be expanded based on which modal is open
      setTutorialContext(TutorialContext.createGame);
    }
  }, [setupOpen, showTutorial]);

  const tutorialContextRef = useRef(tutorialContext);

  // Keep the ref in sync with the state
  useEffect(() => {
    tutorialContextRef.current = tutorialContext;
  }, [tutorialContext]);

  const captainId = game?.playerRoundInfo?.[0]?.player?.id;
  const iAmCaptain = !!me?.id && captainId === me.id;

  useEffect(() => {
    if (
      game &&
      tutorialContextRef.current !== TutorialContext.startGameOptions &&
      tutorialContextRef.current !== TutorialContext.startingAutoBid
    ) {
      // Update tutorial context based on game status
      let newContext: TutorialContext = TutorialContext.inGame;
      let shouldShowTutorial = false;

      switch (game.status) {
        case GameStatus.acceptingPlayers:
          newContext = TutorialContext.inGame;
          // Show tutorial for waiting room (only if tutorial mode is on and not seen)
          shouldShowTutorial =
            tutorialMode && !seenTutorialContexts.has(TutorialContext.inGame);
          break;
        case GameStatus.biddingOpen:
        case GameStatus.biddingClosed:
        case GameStatus.gameOver:
          if (game.status === GameStatus.biddingOpen) {
            newContext = TutorialContext.bidding;
            shouldShowTutorial =
              tutorialMode &&
              !seenTutorialContexts.has(TutorialContext.bidding);
          } else {
            newContext = TutorialContext.playing;
            shouldShowTutorial =
              tutorialMode &&
              !seenTutorialContexts.has(TutorialContext.playing);
          }
          break;
        default:
          newContext = TutorialContext.inGame;
      }

      // Only update context if it's different to avoid unnecessary re-renders
      if (newContext !== tutorialContextRef.current) {
        // If we're currently showing a tutorial and the context is changing,
        // mark the current context as seen and hide the tutorial
        if (
          showTutorial &&
          tutorialContextRef.current !== TutorialContext.inGame
        ) {
          setSeenTutorialContexts((prev) =>
            new Set(prev).add(tutorialContextRef.current),
          );
          setShowTutorial(false);
        }
        setTutorialContext(newContext);
      }

      // Auto-show tutorial for relevant game states if not already showing and tutorial mode is on
      // and tutorial hasn't been seen
      if (
        shouldShowTutorial &&
        !showTutorial &&
        !seenTutorialContexts.has(newContext)
      ) {
        setShowTutorial(true);
        setSeenTutorialContexts((prev) => new Set(prev).add(newContext));
      }
    }
  }, [
    game?.status,
    game?.playerRoundInfo?.length,
    game?.isRandomBid,
    captainId,
    game,
    tutorialMode,
    seenTutorialContexts,
    showTutorial,
    me?.id,
  ]);

  // Handle startGameOptions, bidding, playing, and startingAutoBid tutorial contexts
  useEffect(() => {
    if (
      tutorialMode &&
      (tutorialContext === TutorialContext.startGameOptions ||
        tutorialContext === TutorialContext.bidding ||
        tutorialContext === TutorialContext.playing ||
        tutorialContext === TutorialContext.startingAutoBid) &&
      !seenTutorialContexts.has(tutorialContext)
    ) {
      setShowTutorial(true);
      setSeenTutorialContexts((prev) => new Set(prev).add(tutorialContext));
    }
  }, [tutorialContext, seenTutorialContexts, tutorialMode]);
  useEffect(() => {
    if (!tutorialMode && showTutorial) {
      setShowTutorial(false);
    }
  }, [tutorialMode, showTutorial]);

  // End the session with a message explaining why, then head back to port
  const endGameSession = useCallback(
    (reason: GameLostReason) => {
      setGame(null);
      setMe(undefined);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      currentHashRef.current = undefined;
      consecutive404sRef.current = 0;
      setGameEndedAt(null);
      setShowRestartButtons(false);
      setGameLostReason(reason);
      setShowGameEndedMessage(true);
      // Show message for a while then redirect
      setTimeout(() => {
        setShowGameEndedMessage(false);
        navigate("/");
      }, 10000);
    },
    [navigate],
  );

  // Shared handling for game GET responses; returns the game when one was received
  const processGameResponse = useCallback(
    (result: { status?: number; data?: Game }): Game | undefined => {
      if (result.status === 404) {
        // Don't give up on a single 404 - the backend may be restarting
        consecutive404sRef.current += 1;
        if (consecutive404sRef.current >= MAX_CONSECUTIVE_404S) {
          endGameSession("gameGone");
        }
        return undefined;
      }
      if (result.status === 304) {
        consecutive404sRef.current = 0;
        return undefined;
      }
      if (result.status !== 200 || !result.data) {
        // Network blip or transient server error - keep polling
        return undefined;
      }
      consecutive404sRef.current = 0;
      const gameData = result.data;
      if (
        me &&
        !gameData.playerRoundInfo.some((pri) => pri.player?.id === me.id)
      ) {
        endGameSession("playerRemoved");
        return undefined;
      }
      setGame(gameData);
      return gameData;
    },
    [me, endGameSession],
  );

  const updateGame = useCallback(
    async (id: string, currentHash: string) => {
      const currentGame = await callGetRoute(GetGameUri(id, currentHash));
      const gameData = processGameResponse(currentGame);

      // Check if game just ended
      if (
        gameData &&
        gameData.status === GameStatus.gameOver &&
        game?.status !== GameStatus.gameOver
      ) {
        setGameEndedAt(new Date());
      }
    },
    [processGameResponse, game?.status],
  );

  const getCurrentHash = useCallback(
    async (id: string) => {
      const currentGame = await callGetRoute(GetGameUri(id));
      const gameData = processGameResponse(currentGame);
      return gameData?.hash;
    },
    [processGameResponse],
  );

  // When the app returns to the foreground, refresh right away instead of
  // waiting for the (possibly throttled) polling interval to fire
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (
        document.visibilityState === "visible" &&
        game?.id &&
        timerRef.current
      ) {
        updateGame(game.id, currentHashRef.current ?? "");
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [game?.id, updateGame]);

  const startUpdateTimer = useCallback(
    (id: string, currentHash?: string) => {
      if (timerRef?.current) {
        return;
      }

      updateGame(id, currentHash ?? currentHashRef.current ?? "");

      timerRef.current = setInterval(() => {
        updateGame(id, currentHashRef.current ?? "");
      }, 1000);
    },
    [updateGame],
  );

  // Handle URL-based game and player loading
  useEffect(() => {
    let cancelled = false;

    const loadFromUrl = async () => {
      // If we have both gameId and playerId in URL, try to load the game and validate the player
      if (urlGameId && urlPlayerId) {
        // Retry a few times so a backend that is still warming up doesn't lose the session
        for (let attempt = 0; attempt < 3; attempt++) {
          const gameResult = await callGetRoute(GetGameUri(urlGameId));
          if (cancelled) {
            return;
          }
          if (gameResult.status === 200) {
            const gameData = gameResult.data as Game;
            const player = gameData.playerRoundInfo?.find(
              (pri) => pri.player?.id === urlPlayerId,
            )?.player;

            if (player) {
              setGame(gameData);
              setMe(player);
              startUpdateTimer(urlGameId, gameData.hash);
            } else {
              // Player not found in game
              endGameSession("playerRemoved");
            }
            return;
          }
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
        if (!cancelled) {
          // Game not found after retries
          endGameSession("gameGone");
        }
      }
      // If we only have gameId, the GameSetup component will handle showing the join UI
      // If no parameters, show the default setup UI
    };

    if (hasWarmedUp && !game) {
      loadFromUrl();
    }

    return () => {
      cancelled = true;
    };
  }, [
    urlGameId,
    urlPlayerId,
    hasWarmedUp,
    startUpdateTimer,
    game,
    endGameSession,
  ]);

  const createGame = useCallback(
    async (playerName: string, expansionEnabled: boolean = false) => {
      const personDto = {
        PlayerName: playerName,
        ExpansionEnabled: expansionEnabled,
      };

      const result = await callPostRoute(
        CreateNewGameUri(),
        JSON.parse(JSON.stringify(personDto)),
      );

      if (result.status !== 201) {
        console.log("Error creating game", result.status, result.statusText);
      } else {
        const gameData = result.data as Game;
        const player = gameData.playerRoundInfo[0].player;
        setGame(gameData);
        setMe(player);
        setSetupOpen(false);
        startUpdateTimer(gameData.id, gameData.hash);
        // Navigate to the game URL with player ID
        navigate(`/${gameData.id}/${player!.id}`);

        // Show tutorial for newly created game
        setTutorialContext(TutorialContext.inGame);
      }
    },
    [navigate, startUpdateTimer],
  );

  const joinGame = useCallback(
    async (gameId: string, playerName: string) => {
      if (!gameId || !playerName) {
        console.log("No game id");
        return;
      }

      const result = await callPutRoute(
        AddPlayerUri(gameId),
        JSON.parse(JSON.stringify({ name: playerName })),
      );

      if (result.status !== 200) {
        console.log("Error joining game", result.status, result.statusText);
      } else {
        const player = result.data;
        // Load the updated game
        const gameResult = await callGetRoute(GetGameUri(gameId));
        if (gameResult.status === 200) {
          const gameData = gameResult.data as Game;
          setGame(gameData);
          setMe(player);
          setSetupOpen(false);
          // Start polling for updates
          startUpdateTimer(gameId, gameData.hash);
          // Navigate to the game URL with player ID
          navigate(`/${gameId}/${player.id}`);

          // Show tutorial for joined game
          setTutorialContext(TutorialContext.inGame);
        }
      }
    },
    [navigate, startUpdateTimer],
  );

  const editPlayerName = useCallback(
    async (player: Player, newName: string) => {
      if (!game?.id || !newName) {
        console.log("No game id");
        return;
      }

      const result = await callPutRoute(
        EditPlayerUri(game.id),
        JSON.parse(JSON.stringify({ ...player, name: newName })),
      );

      if (result.status !== 200) {
        console.log("Error changing name", result.status, result.statusText);
      } else {
        updateGame(game.id, currentHashRef.current ?? "");
      }
    },
    [game?.id, updateGame],
  );

  const addPlayerAsOwner = useCallback(
    async (playerName: string) => {
      if (!game?.id || !playerName) {
        return;
      }

      const result = await callPutRoute(
        AddPlayerUri(game.id),
        JSON.parse(JSON.stringify({ name: playerName })),
      );

      if (result.status !== 200) {
        console.log("Error adding player", result.status, result.statusText);
      } else {
        updateGame(game.id, currentHashRef.current ?? "");
      }
    },
    [game?.id, updateGame],
  );

  const removeOtherPlayer = useCallback(
    async (playerId: string) => {
      if (!game?.id || !me?.id) {
        return;
      }

      const result = await callDeleteRoute(
        RemovePlayerUri(game.id, playerId, me.id, currentHashRef.current ?? ""),
      );

      if (result.status !== 200 && result.status !== 404) {
        console.log("Error removing player", result.status, result.statusText);
      } else {
        updateGame(game.id, currentHashRef.current ?? "");
      }
    },
    [game?.id, me?.id, updateGame],
  );

  const reorderPlayers = useCallback(
    async (playerOrder: string[]) => {
      if (!game?.id || !me?.id) {
        return;
      }

      // First, get the latest game data to ensure we have the current hash
      await updateGame(game.id, "");

      const result = await callPutRoute(
        GameReorderPlayersUri(game.id),
        JSON.parse(
          JSON.stringify({
            playerOrder: playerOrder,
            playerId: me.id,
            knownHash: currentHashRef.current ?? "",
          }),
        ),
      );

      if (result.status !== 200) {
        // Error handling could be added here if needed
      } else {
        updateGame(game.id, currentHashRef.current ?? "");
      }
    },
    [game?.id, me?.id, updateGame],
  );

  const handleTutorialContextChanged = useCallback(
    (context: TutorialContext) => {
      setTutorialContext(context);
    },
    [],
  );

  const startGame = useCallback(
    async (randomBids: boolean, gameDifficulty: GameDifficulty) => {
      if (
        !game?.id ||
        game.playerRoundInfo?.length < 2 ||
        game.playerRoundInfo[0].player.id !== me?.id
      ) {
        console.log("Cannot start game");
        return;
      }

      const result = await callGetRoute(
        StartGameUri(game.id, me.id, game.hash, randomBids, gameDifficulty),
      );

      if (result.status !== 200) {
        console.log("Could not start game", result.status, result.statusText);
      } else {
        updateGame(game.id, currentHashRef.current ?? "");
      }
    },
    [game?.hash, game?.id, game?.playerRoundInfo, me?.id, updateGame],
  );

  const restartGame = useCallback(async () => {
    if (!game || !me) {
      console.log("No game or player");
      return;
    }

    const result = await callGetRoute(
      GameResetUri(game.id, me.id, currentHashRef.current ?? ""),
    );

    if (result.status !== 200) {
      console.log("Error resetting game", result.status, result.statusText);
      return;
    }

    // Clear the game state for restart
    setGameEndedAt(null);
    setShowRestartButtons(false);

    // Update the game with the reset state
    updateGame(game.id, currentHashRef.current ?? "");
  }, [game, me, updateGame]);

  const moveToPreviousGameStatus = useCallback(
    async (hash?: string) => {
      if (!game || !me) {
        console.log("No game or player");
        return;
      }

      setChangingGame(true);
      // Attempt to update the game status
      const result = await callGetRoute(
        GameMovePreviousPhaseUri(game.id, me.id, hash ?? game.hash),
      );

      if (result.status !== 200) {
        console.log("Could not move to previous phase");
        if (result.status === 409) {
          console.log("Updating data and trying again");
          const hash = await getCurrentHash(game.id);
          moveToPreviousGameStatus(hash);
        }
      } else {
        await updateGame(game.id, currentHashRef.current ?? "");
        setChangingGame(false);
      }
    },
    [game, getCurrentHash, me, updateGame],
  );

  const moveToNextGameStatus = useCallback(
    async (hash?: string) => {
      if (!game || !me) {
        console.log("No game or player");
        return;
      }

      setChangingGame(true);
      // Attempt to update the game status
      const result = await callGetRoute(
        GameMoveNextPhaseUri(game.id, me.id, hash ?? game.hash),
      );

      if (result.status !== 200) {
        console.log("Could not move to next phase");
        if (result.status === 409) {
          console.log("Updating data and trying again");
          setTimeout(async () => {
            const hash = await getCurrentHash(game.id);
            moveToNextGameStatus(hash);
          }, 500);
        }
      } else {
        updateGame(game.id, currentHashRef.current ?? "");
        setChangingGame(false);
      }
    },
    [game, getCurrentHash, me, updateGame],
  );

  const exitGame = useCallback(async () => {
    if (game && me) {
      // Call the backend to remove the player
      const result = await callDeleteRoute(
        RemovePlayerUri(game.id, me.id, me.id, currentHashRef.current ?? ""),
      );
      if (result.status === 200 || result.status === 404) {
        // Successfully removed or game/player not found
      } else {
        console.log("Error leaving game", result.status, result.statusText);
      }
    }
    // Clear the game state and navigate to home
    setGame(null);
    setMe(undefined);
    clearInterval(timerRef.current!);
    timerRef.current = null;
    currentHashRef.current = undefined;
    setShowExitPopup(false);
    setGameEndedAt(null);
    setShowRestartButtons(false);
    navigate("/");
  }, [game, me, navigate]);

  // Update footer height CSS variable for dynamic share button positioning
  useLayoutEffect(() => {
    const updateFooterHeight = () => {
      if (footerRef.current) {
        const height = footerRef.current.offsetHeight;
        document.documentElement.style.setProperty(
          "--footer-height",
          `${height}px`,
        );
      }
    };

    updateFooterHeight();

    // Update on window resize
    window.addEventListener("resize", updateFooterHeight);
    return () => window.removeEventListener("resize", updateFooterHeight);
  }, [game]);
  return (
    <div className={classNames("App", "pirateFont")}>
      <SimpleModal
        title={"Exit Game"}
        content={
          <>
            Are you sure you want to exit this game (you won't be able to get
            back into it.)
          </>
        }
        defaultButtonContent={"Exit"}
        alternateButtonContent={"Cancel"}
        onAccept={exitGame}
        onCancel={() => setShowExitPopup(false)}
        show={showExitPopup}
        centered={false}
        fullScreen={false}
        backdrop={showTutorial ? false : true}
      />
      <SimpleModal
        title={"Cannot Abandon Ship"}
        content={
          <>
            As the captain, ye cannot abandon the ship until every other member
            of the crew has left!
          </>
        }
        defaultButtonContent={"OK"}
        onAccept={() => setShowCaptainCannotLeavePopup(false)}
        onCancel={() => setShowCaptainCannotLeavePopup(false)}
        show={showCaptainCannotLeavePopup}
        centered={false}
        fullScreen={false}
        backdrop={showTutorial ? false : true}
      />
      <Stack gap={2}>
        <GameInfo
          game={game}
          me={me!}
          editPlayerName={editPlayerName}
          reorderPlayers={reorderPlayers}
          addPlayer={
            game?.status === GameStatus.acceptingPlayers && iAmCaptain
              ? addPlayerAsOwner
              : undefined
          }
          removePlayer={
            game?.status === GameStatus.acceptingPlayers && iAmCaptain
              ? removeOtherPlayer
              : undefined
          }
          startGame={
            game?.status === GameStatus.acceptingPlayers &&
            (game.playerRoundInfo?.length ?? 0) > 1 &&
            iAmCaptain
              ? startGame
              : undefined
          }
          onTutorialContextChanged={handleTutorialContextChanged}
        />
        <GameSetup
          createGame={!game && !urlGameId ? createGame : undefined}
          joinGame={!game ? joinGame : undefined}
          defaultGameId={urlGameId}
          playerId={urlPlayerId}
          onSetupModalChanged={(open: boolean) => setSetupOpen(open)}
          showTutorial={showTutorial}
          onTutorialContextChanged={(context: TutorialContext) => {
            if (showTutorial) {
              setTutorialContext(context);
            } else {
              // If tutorial is not showing but user is interacting with tutorial-enabled elements,
              // we could optionally show it here, but for now let's keep it as-is
              setTutorialContext(context);
            }
          }}
        />
        {game && game?.status !== GameStatus.acceptingPlayers && (
          <div>
            <PlayArea
              game={game}
              me={me!}
              moveToNextGameStatus={moveToNextGameStatus}
              moveToPreviousGameStatus={moveToPreviousGameStatus}
              gameChanging={gameChanging}
              getCurrentHash={() => getCurrentHash(game.id)}
              showRestartButtons={showRestartButtons}
              onRestartGame={restartGame}
              onTutorialContextChanged={handleTutorialContextChanged}
            />
            <div style={{ height: 75 }} />
          </div>
        )}
        {game && game.status === GameStatus.acceptingPlayers && (
          <img
            src="/images/logo.png"
            alt="Get ready to battle yer priate friends!"
          />
        )}
      </Stack>
      {game && (
        <img
          className={"exitGameButton"}
          src="/images/skeleton.png"
          alt="Abandon yer mates."
          onClick={() => {
            if (iAmCaptain && (game.playerRoundInfo?.length ?? 0) > 1) {
              setShowCaptainCannotLeavePopup(true);
            } else {
              setShowExitPopup(true);
            }
          }}
        />
      )}
      {/* Share button positioned above footer (fixed) - show when not in setup and game is not in progress */}
      {!setupOpen &&
        (!game ||
          game?.status === GameStatus.acceptingPlayers ||
          game?.status === GameStatus.gameOver) && (
          <Button
            className="shareFloating pirateShare"
            variant="outline-primary"
            size="sm"
            onClick={() => {
              const origin = window?.location?.origin ?? "https://skullk.ing";
              const url =
                game && game?.status === GameStatus.acceptingPlayers
                  ? `${origin}/${game.id}`
                  : origin + "/";

              const nav = navigator as Navigator & {
                share?: (data: ShareData) => Promise<void>;
              };
              if (nav.share) {
                nav
                  .share({ title: "Skull King", url })
                  .catch(() => navigator.clipboard?.writeText(url));
              } else if (navigator.clipboard?.writeText) {
                navigator.clipboard.writeText(url);
                alert("Share link copied to clipboard: " + url);
              } else {
                window.prompt("Copy this link", url);
              }
            }}
          >
            <img src="/images/map-color.png" alt="map" className="pirateIcon" />
            Share the Map!
          </Button>
        )}

      {/* Game Ended Message */}
      <SimpleModal
        title={
          gameLostReason === "playerRemoved"
            ? "Ye Walked the Plank!"
            : "Arrr! The Game Be Lost at Sea!"
        }
        content={
          <>
            <p
              style={{
                fontSize: "1.2rem",
                color: "#8B4513",
                textAlign: "center",
              }}
            >
              {gameLostReason === "playerRemoved"
                ? "Ye be no longer part of this crew, ye scurvy dog!"
                : "This game can no longer be found, ye scurvy dogs!"}
            </p>
            <p
              style={{
                fontSize: "1rem",
                color: "#654321",
                textAlign: "center",
                marginTop: "1rem",
              }}
            >
              {gameLostReason === "playerRemoved"
                ? "Find a new crew to sail with!"
                : "The crew may have disbanded, or the ship went down. Find a new crew to sail with!"}
            </p>
          </>
        }
        defaultButtonContent={"Back to Port"}
        onAccept={() => {
          setShowGameEndedMessage(false);
          navigate("/");
        }}
        onCancel={() => {
          setShowGameEndedMessage(false);
          navigate("/");
        }}
        show={showGameEndedMessage}
        centered={true}
        fullScreen={false}
      />

      <div
        className={classNames("gameFooter", { "game-active": !!game })}
        ref={footerRef}
      >
        <span style={{ marginRight: 4, whiteSpace: "nowrap" }}>
          A scoring application for the
        </span>
        <div style={{ color: "#4f779f", whiteSpace: "nowrap" }}>
          <NavLink
            target="_blank"
            href="https://www.grandpabecksgames.com/pages/skull-king"
          >
            Skull King
          </NavLink>
        </div>
        <span style={{ marginLeft: 4, whiteSpace: "nowrap", marginRight: 12 }}>
          card game.
        </span>
        <div
          className="tutorial-toggle"
          onClick={() => {
            if (tutorialMode) {
              // If tutorial mode is on, turn it off
              setTutorialMode(false);
              setShowTutorial(false);
            } else {
              // If tutorial mode is off, show the enable popup
              setShowTutorialPrompt(true);
            }
          }}
          title={
            tutorialMode
              ? "Click to disable tutorial hints"
              : "Click to enable tutorial hints"
          }
        >
          <QuestionCircle
            size={20}
            color={tutorialMode ? "#ffd700" : "#666"}
            style={{ cursor: "pointer" }}
          />
        </div>
      </div>
      <Tutorial
        show={showTutorialPrompt}
        onClose={() => {
          setShowTutorialPrompt(false);
          // Set cookie to remember they've seen the prompt
          setCookie("skullKingTutorialPromptSeen", "true");
        }}
        onComplete={() => {
          setTutorialMode(true);
          setShowTutorialPrompt(false);
          setShowTutorial(true);
          setTutorialContext(TutorialContext.home);
          setSeenTutorialContexts(new Set()); // Reset seen contexts for fresh tutorial experience
          // Set cookie to remember they've seen the prompt
          setCookie("skullKingTutorialPromptSeen", "true");
        }}
        context={TutorialContext.initialPrompt}
        playerCount={game?.playerRoundInfo?.length}
        iAmCaptain={iAmCaptain}
        isRandomBid={game?.isRandomBid}
      />
      <Tutorial
        show={showTutorial}
        onClose={() => {
          setShowTutorial(false);
          setSeenTutorialContexts((prev) => new Set(prev).add(tutorialContext));
          // Reset context back to inGame when tutorial is closed
          if (
            tutorialContext === TutorialContext.startGameOptions ||
            tutorialContext === TutorialContext.startingAutoBid
          ) {
            setTutorialContext(TutorialContext.inGame);
          }
        }}
        onComplete={() => {
          setShowTutorial(false);
          // Mark this tutorial context as completed/permanently seen
          setSeenTutorialContexts((prev) => new Set(prev).add(tutorialContext));
          // Reset context back to inGame when tutorial is completed
          if (
            tutorialContext === TutorialContext.startGameOptions ||
            tutorialContext === TutorialContext.startingAutoBid
          ) {
            setTutorialContext(TutorialContext.inGame);
          }
        }}
        context={tutorialContext}
        playerCount={game?.playerRoundInfo?.length}
        iAmCaptain={iAmCaptain}
        isRandomBid={game?.isRandomBid}
      />
    </div>
  );
};

export default App;
