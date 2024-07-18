import "bootstrap/dist/css/bootstrap.min.css";
import Button from "react-bootstrap/esm/Button";
import Stack from "react-bootstrap/esm/Stack";
import { useCallback, useEffect, useRef, useState } from "react";
import { callGetRoute, callPostRoute, callPutRoute } from "./utils/api-utils";
import {
  AddPlayerUri,
  CreateNewGameUri,
  EditPlayerUri,
  GetGameUri,
} from "./service-paths";
import { Game } from "./types/game";
import { TextInputArea } from "./common/input-area/text-input-area";
import { SimpleModal } from "./common/simple-modal";

const App = () => {
  const [showStartGameUI, setShowStartGameUI] = useState(false);
  const [showJoinGameUI, setShowJoinGameUI] = useState(false);
  const [showEditPlayerUI, setShowEditPlayerUI] = useState(false);
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

  const editPlayerName = useCallback(async () => {
    if (!game?.id || !playerName) {
      console.log("No game id");
      return;
    }

    const result = await callPutRoute(
      EditPlayerUri(game.id),
      JSON.parse(JSON.stringify({ id: myPlayerId, name: playerName }))
    );

    if (result.status !== 200) {
      console.log("Error changing name", result.status, result.statusText);
    } else {
      setShowEditPlayerUI(false);
      updateGame(game.id, currentHashRef.current ?? "");
    }
  }, [game?.id, myPlayerId, playerName, updateGame]);

  const getStartGameUI = () => {
    return (
      <TextInputArea
        startingValue={playerName}
        setNewValue={(newValue) => setPlayerName(newValue)}
        width={"150"}
        placeholder="Enter your name"
        onEnter={startGame}
        isValid={(playerName?.length ?? 0) > 0}
        autoFocus={true}
      />
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
          isValid={(gameId?.length ?? 0) === 4}
          autoFocus={true}
          inputFormatter={(textWithSelection) => ({
            ...textWithSelection,
            value: textWithSelection.value.toUpperCase(),
          })}
        />
        <TextInputArea
          startingValue={playerName}
          setNewValue={(newValue) => setPlayerName(newValue)}
          width={"150"}
          placeholder="Enter your name"
          onEnter={gameId?.length && playerName?.length ? joinGame : undefined}
          isValid={(playerName?.length ?? 0) > 0}
        />
      </Stack>
    );
  };

  const getEditPlayerNameUI = () => {
    return (
      <TextInputArea
        startingValue={playerName}
        setNewValue={(newValue) => setPlayerName(newValue)}
        width={"150"}
        placeholder="Enter your name"
        onEnter={editPlayerName}
        isValid={(playerName?.length ?? 0) > 0}
        autoFocus={true}
      />
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
      {showStartGameUI && (
        <SimpleModal
          title={"New Game"}
          content={getStartGameUI()}
          defaultButtonContent={"Start"}
          onAccept={() => startGame()}
          onCancel={() => setShowStartGameUI(false)}
          allowAccept={!!playerName}
          show={true}
        />
      )}
      {showJoinGameUI && (
        <SimpleModal
          title={"Join Game"}
          content={getJoinGameUI()}
          defaultButtonContent={"Join"}
          onAccept={() => joinGame()}
          onCancel={() => setShowJoinGameUI(false)}
          allowAccept={!!playerName && gameId?.length === 4}
          show={true}
        />
      )}
      {showEditPlayerUI && (
        <SimpleModal
          title={"Edit Player Name"}
          content={getEditPlayerNameUI()}
          defaultButtonContent={"Save"}
          onAccept={() => editPlayerName()}
          onCancel={() => setShowEditPlayerUI(false)}
          allowAccept={!!playerName}
          show={true}
        />
      )}
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

