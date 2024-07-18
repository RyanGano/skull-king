import "bootstrap/dist/css/bootstrap.min.css";
import Button from "react-bootstrap/esm/Button";
import Stack from "react-bootstrap/esm/Stack";
import { useCallback, useEffect, useRef, useState } from "react";
import { callGetRoute, callPostRoute, callPutRoute } from "./utils/api-utils";
import { AddPlayerUri, CreateNewGameUri, GetGameUri } from "./service-paths";
import { Game } from "./types/game";
import { TextInputArea } from "./common/input-area/text-input-area";

const App = () => {
  const [showStartGameUI, setShowStartGameUI] = useState(false);
  const [showJoinGameUI, setShowJoinGameUI] = useState(false);
  const [playerName, setPlayerName] = useState<string>();
  const [gameId, setGameId] = useState<string>();
  const [game, setGame] = useState<Game | null>(null);
  const [myPlayerId, setMyPlayerId] = useState<string>();
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const currentHashRef = useRef<string | undefined>();

  useEffect(() => {
    currentHashRef.current = game?.hash;
  }, [game?.hash]);

  const updateGame = useCallback(async (id: string, currentHash: string) => {
    const currentGame = await callGetRoute(GetGameUri(id, currentHash));
    if (currentGame.status !== 304) {
      setGame(currentGame.data);
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
      }, 2500);
    },
    [updateGame]
  );

  const startGame = useCallback(async () => {
    const personDto = { playerName: playerName };

    const result = await callPostRoute(
      CreateNewGameUri(),
      JSON.parse(JSON.stringify(personDto))
    );

    if (result.status !== 201) {
      console.log("Error creating game", result.status, result.statusText);
    } else {
      setGame(result.data);
      startUpdateTimer(result.data?.id);
      setShowStartGameUI(false);
      setMyPlayerId(result.data.players[0].id);
    }
  }, [playerName, startUpdateTimer]);

  const joinGame = useCallback(async () => {
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
      startUpdateTimer(gameId);
      setShowJoinGameUI(false);
      setMyPlayerId(result.data.id);
    }
  }, [gameId, playerName, startUpdateTimer]);

  const getStartGameUI = () => {
    return (
      <Stack gap={2}>
        <TextInputArea
          startingValue={playerName}
          setNewValue={(newValue) => setPlayerName(newValue)}
          width={"150"}
          placeholder="Enter your name"
          onEnter={startGame}
          isValid={(playerName?.length ?? 0) > 0}
          autoFocus={true}
        />
        <Stack direction="horizontal" gap={3}>
          <Button
            onClick={playerName ? startGame : undefined}
            disabled={!playerName}
          >
            Start Game
          </Button>
          <Button variant="link" onClick={() => setShowStartGameUI(false)}>
            Cancel
          </Button>
        </Stack>
      </Stack>
    );
  };

  const getJoinGameUI = () => {
    return (
      <Stack gap={2}>
        <TextInputArea
          startingValue={gameId}
          setNewValue={(newValue) => setGameId(newValue)}
          width={"150"}
          placeholder="Game Id"
          onEnter={gameId?.length && playerName?.length ? joinGame : undefined}
          isValid={(gameId?.length ?? 0) > 0}
          autoFocus={true}
        />
        <TextInputArea
          startingValue={playerName}
          setNewValue={(newValue) => setPlayerName(newValue)}
          width={"150"}
          placeholder="Enter your name"
          onEnter={gameId?.length && playerName?.length ? joinGame : undefined}
          isValid={(playerName?.length ?? 0) > 0}
        />
        <Stack direction="horizontal" gap={3}>
          <Button
            onClick={playerName && gameId ? joinGame : undefined}
            disabled={!playerName || !gameId}
          >
            Join Game
          </Button>
          <Button variant="link" onClick={() => setShowJoinGameUI(false)}>
            Cancel
          </Button>
        </Stack>
      </Stack>
    );
  };

  return (
    <Stack gap={2}>
      {game && <span>Game ID: {game?.id}</span>}
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
                {myPlayerId === x.id ? (
                  <Button variant="link" className={"textLink"}>
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
      {showStartGameUI && getStartGameUI()}
      {showJoinGameUI && getJoinGameUI()}
      {!showStartGameUI && !showJoinGameUI && !game && (
        <Button onClick={() => setShowStartGameUI(true)}>Start Game</Button>
      )}
      {!showStartGameUI && !showJoinGameUI && !game && (
        <Button onClick={() => setShowJoinGameUI(true)}>Join Game</Button>
      )}
    </Stack>
  );
};

export default App;

