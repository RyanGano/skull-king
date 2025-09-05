import "bootstrap/dist/css/bootstrap.min.css";
import Stack from "react-bootstrap/esm/Stack";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  callGetRoute,
  callPostRoute,
  callPutRoute,
  callDeleteRoute,
} from "./utils/api-utils";
import {
  AddPlayerUri,
  CreateNewGameUri,
  EditPlayerUri,
  GameMoveNextPhaseUri,
  GameMovePreviousPhaseUri,
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
import classNames from "classnames";
import { NavLink } from "react-bootstrap";
import { Button } from "react-bootstrap";

const App = () => {
  const navigate = useNavigate();
  const { gameId: urlGameId, playerId: urlPlayerId } = useParams<{
    gameId?: string;
    playerId?: string;
  }>();
  const [game, setGame] = useState<Game | null>(null);
  const [me, setMe] = useState<Player>();
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const currentHashRef = useRef<string | undefined>();
  const [showExitPopup, setShowExitPopup] = useState(false);
  const [gameChanging, setChangingGame] = useState(false);
  const [hasWarmedUp, setHasWarmedUp] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);
  const [showGameEndedMessage, setShowGameEndedMessage] = useState(false);

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

  useEffect(() => {
    currentHashRef.current = game?.hash;
  }, [game?.hash]);

  const updateGame = useCallback(
    async (id: string, currentHash: string) => {
      const currentGame = await callGetRoute(GetGameUri(id, currentHash));
      if (currentGame.status === 404) {
        // Game not found, probably deleted because everyone left
        setGame(null);
        setMe(undefined);
        clearInterval(timerRef.current!);
        timerRef.current = null;
        currentHashRef.current = undefined;
        setShowGameEndedMessage(true);
        // Show message for 3 seconds then redirect
        setTimeout(() => {
          setShowGameEndedMessage(false);
          navigate("/");
        }, 10000);
        return;
      }
      if (currentGame.status !== 304) {
        const gameData = currentGame.data as Game;
        if (
          me &&
          !gameData.playerRoundInfo.some((pri) => pri.player?.id === me.id)
        ) {
          // Player no longer in the game
          setGame(null);
          setMe(undefined);
          clearInterval(timerRef.current!);
          timerRef.current = null;
          currentHashRef.current = undefined;
          navigate("/");
          return;
        }
        setGame(gameData);
      }
    },
    [me, navigate]
  );

  const getCurrentHash = useCallback(
    async (id: string) => {
      const currentGame = await callGetRoute(GetGameUri(id));
      if (currentGame.status === 404) {
        // Game not found, probably deleted because everyone left
        setGame(null);
        setMe(undefined);
        clearInterval(timerRef.current!);
        timerRef.current = null;
        currentHashRef.current = undefined;
        setShowGameEndedMessage(true);
        // Show message for 3 seconds then redirect
        setTimeout(() => {
          setShowGameEndedMessage(false);
          navigate("/");
        }, 3000);
        return;
      }
      if (currentGame.status !== 304) {
        const gameData = currentGame.data as Game;
        if (
          me &&
          !gameData.playerRoundInfo.some((pri) => pri.player?.id === me.id)
        ) {
          // Player no longer in the game
          setGame(null);
          setMe(undefined);
          clearInterval(timerRef.current!);
          timerRef.current = null;
          currentHashRef.current = undefined;
          navigate("/");
          return;
        }
        setGame(currentGame.data);
        return currentGame.data.hash;
      }
    },
    [me, navigate]
  );

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
    [updateGame]
  );

  // Handle URL-based game and player loading
  useEffect(() => {
    const loadFromUrl = async () => {
      // If we have both gameId and playerId in URL, try to load the game and validate the player
      if (urlGameId && urlPlayerId) {
        try {
          const gameResult = await callGetRoute(GetGameUri(urlGameId));
          if (gameResult.status === 200) {
            const gameData = gameResult.data;
            const player = (gameData as Game).playerRoundInfo?.find(
              (pri) => pri.player?.id === urlPlayerId
            )?.player;

            if (player) {
              setGame(gameData);
              setMe(player);
              startUpdateTimer(urlGameId, gameData.hash);
            } else {
              // Player not found in game, redirect to home
              navigate("/");
            }
          } else {
            // Game not found, redirect to home
            navigate("/");
          }
        } catch (error) {
          // Error loading, redirect to home
          navigate("/");
        }
      }
      // If we only have gameId, the GameSetup component will handle showing the join UI
      // If no parameters, show the default setup UI
    };

    if (hasWarmedUp && !game) {
      loadFromUrl();
    }
  }, [urlGameId, urlPlayerId, hasWarmedUp, navigate, startUpdateTimer, game]);

  const createGame = useCallback(
    async (playerName: string) => {
      const personDto = { PlayerName: playerName };

      const result = await callPostRoute(
        CreateNewGameUri(),
        JSON.parse(JSON.stringify(personDto))
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
      }
    },
    [navigate, startUpdateTimer]
  );

  const joinGame = useCallback(
    async (gameId: string, playerName: string) => {
      if (!gameId || !playerName) {
        console.log("No game id");
        return;
      }

      const result = await callPutRoute(
        AddPlayerUri(gameId),
        JSON.parse(JSON.stringify({ name: playerName }))
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
        }
      }
    },
    [navigate, startUpdateTimer]
  );

  const editPlayerName = useCallback(
    async (newName: string) => {
      if (!game?.id || !newName) {
        console.log("No game id");
        return;
      }

      const result = await callPutRoute(
        EditPlayerUri(game.id),
        JSON.parse(JSON.stringify({ ...me, name: newName }))
      );

      if (result.status !== 200) {
        console.log("Error changing name", result.status, result.statusText);
      } else {
        updateGame(game.id, currentHashRef.current ?? "");
      }
    },
    [game?.id, me, updateGame]
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
        StartGameUri(game.id, me.id, game.hash, randomBids, gameDifficulty)
      );

      if (result.status !== 200) {
        console.log("Could not start game", result.status, result.statusText);
      } else {
        updateGame(game.id, currentHashRef.current ?? "");
      }
    },
    [game?.hash, game?.id, game?.playerRoundInfo, me?.id, updateGame]
  );

  const moveToPreviousGameStatus = useCallback(
    async (hash?: string) => {
      if (!game || !me) {
        console.log("No game or player");
        return;
      }

      setChangingGame(true);
      // Attempt to update the game status
      const result = await callGetRoute(
        GameMovePreviousPhaseUri(game.id, me.id, hash ?? game.hash)
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
    [game, getCurrentHash, me, updateGame]
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
        GameMoveNextPhaseUri(game.id, me.id, hash ?? game.hash)
      );

      if (result.status !== 200) {
        console.log("Could not move to next phase");
        if (result.status === 409) {
          console.log("Updating data and trying again");
          setTimeout(async () => {
            const hash = await getCurrentHash(game.id);
            moveToNextGameStatus(hash);
          }, 500); // 500 milliseconds delay
        }
      } else {
        updateGame(game.id, currentHashRef.current ?? "");
        setChangingGame(false);
      }
    },
    [game, getCurrentHash, me, updateGame]
  );

  const exitGame = useCallback(async () => {
    if (game && me) {
      // Call the backend to remove the player
      const result = await callDeleteRoute(
        RemovePlayerUri(game.id, me.id, currentHashRef.current ?? "")
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
    navigate("/");
  }, [game, me, navigate]);

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
      />
      <Stack gap={2}>
        <GameInfo
          game={game}
          me={me!}
          editMyName={editPlayerName}
          startGame={
            game?.status === GameStatus.acceptingPlayers &&
            (game.playerRoundInfo?.length ?? 0) > 1 &&
            game?.playerRoundInfo?.[0].player.id === me?.id
              ? startGame
              : undefined
          }
        />
        <GameSetup
          createGame={!game && !urlGameId ? createGame : undefined}
          joinGame={!game ? joinGame : undefined}
          defaultGameId={urlGameId}
          playerId={urlPlayerId}
          onSetupModalChanged={(open: boolean) => setSetupOpen(open)}
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
          onClick={() => setShowExitPopup(true)}
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
        title={"Arrr! The Crew Abandoned Ship!"}
        content={
          <>
            <p
              style={{
                fontSize: "1.2rem",
                color: "#8B4513",
                textAlign: "center",
              }}
            >
              All yer mates have left the game, ye scurvy dogs!
            </p>
            <p
              style={{
                fontSize: "1rem",
                color: "#654321",
                textAlign: "center",
                marginTop: "1rem",
              }}
            >
              The game has been disbanded. Find a new crew to sail with!
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

      <div className="gameFooter">
        <span style={{ marginRight: 4 }}>A scoring application for the </span>
        <div style={{ color: "#4f779f" }}>
          <NavLink
            target="_blank"
            href="https://www.grandpabecksgames.com/pages/skull-king"
          >
            Skull King
          </NavLink>
        </div>
        <span style={{ marginLeft: 4 }}>card game.</span>
      </div>
    </div>
  );
};

export default App;
