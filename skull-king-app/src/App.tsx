import "bootstrap/dist/css/bootstrap.min.css";
import Stack from "react-bootstrap/esm/Stack";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { callGetRoute, callPostRoute, callPutRoute } from "./utils/api-utils";
import {
  AddPlayerUri,
  CreateNewGameUri,
  EditPlayerUri,
  GameMoveNextPhaseUri,
  GameMovePreviousPhaseUri,
  GetGameUri,
  GetWarmupUri,
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

  const updateGame = useCallback(async (id: string, currentHash: string) => {
    const currentGame = await callGetRoute(GetGameUri(id, currentHash));
    if (currentGame.status !== 304) {
      setGame(currentGame.data);
    }
  }, []);

  const getCurrentHash = useCallback(async (id: string) => {
    const currentGame = await callGetRoute(GetGameUri(id));
    if (currentGame.status !== 304) {
      setGame(currentGame.data);
      return currentGame.data.hash;
    }
  }, []);

  const startUpdateTimer = useCallback(
    (id: string) => {
      if (timerRef?.current) {
        return;
      }

      updateGame(id, currentHashRef.current ?? "");

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
              startUpdateTimer(urlGameId);
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
      const personDto = { playerName: playerName };

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
        // Navigate to the game URL with player ID
        navigate(`/${gameData.id}/${player!.id}`);
      }
    },
    [navigate]
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
        setMe(player);
        // Navigate to the game URL with player ID
        navigate(`/${gameId}/${player.id}`);
      }
    },
    [navigate]
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

  const exitGame = useCallback(() => {
    // Clear the game state and navigate to home
    setGame(null);
    setMe(undefined);
    clearInterval(timerRef.current!);
    timerRef.current = null;
    currentHashRef.current = undefined;
    setShowExitPopup(false);
    navigate("/");
  }, [navigate]);

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
