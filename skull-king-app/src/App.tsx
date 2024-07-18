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

    setGame(result.data);
    startUpdateTimer(result.data?.id);
  }, [playerName, startUpdateTimer]);

  const joinGame = useCallback(async () => {
    const personDto = { name: playerName };

    const result = await callPutRoute(
      AddPlayerUri(gameId!),
      JSON.parse(JSON.stringify(personDto))
    );

    if (result.status === 200) {
      startUpdateTimer(gameId!);
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
        <Button onClick={startGame}>Start Game</Button>
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
        <Button onClick={joinGame}>Join Game</Button>
      </Stack>
    );
  };

  return (
    <Stack gap={2}>
      {/* {error && <span>{error}</span>} */}
      <span>Game ID: {game?.id}</span>
      <span>Players: {game?.players?.map((x) => x.name).join(", ")}</span>
      {showStartGameUI && getStartGameUI()}
      {showJoinGameUI && getJoinGameUI()}
      {!showStartGameUI && !showJoinGameUI && (
        <Button onClick={() => setShowStartGameUI(true)}>Start Game</Button>
      )}
      {!showStartGameUI && !showJoinGameUI && (
        <Button onClick={() => setShowJoinGameUI(true)}>Join Game</Button>
      )}
    </Stack>
  );
};

export default App;

