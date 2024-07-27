import "bootstrap/dist/css/bootstrap.min.css";
import Stack from "react-bootstrap/esm/Stack";
import { useCallback, useEffect, useRef, useState } from "react";
import { callGetRoute, callPostRoute, callPutRoute } from "./utils/api-utils";
import {
  AddPlayerUri,
  CreateNewGameUri,
  EditPlayerUri,
  GameMoveNextPhaseUri,
  GameMovePreviousPhaseUri,
  GetGameUri,
  StartGameUri,
} from "./service-paths";
import { Game, GameStatus, Player } from "./types/game";
import { PlayArea } from "./components/PlayArea";
import { GameInfo } from "./components/GameInfo";
import { GameSetup } from "./components/GameSetup";
import { useCookies } from "react-cookie";
import { SimpleModal } from "./common/simple-modal";

const App = () => {
  const [game, setGame] = useState<Game | null>(null);
  const [me, setMe] = useState<Player>();
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const currentHashRef = useRef<string | undefined>();
  const [cookies, setCookie] = useCookies(["skull_king"]);
  const [showExitPopup, setShowExitPopup] = useState(false);

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

  // Handle storing and retrieving game cookies. This
  // allows a player to return to a game if they happen
  // to refresh the page, or if their browser exits.
  useEffect(() => {
    if (game?.status == GameStatus.gameOver && cookies.skull_king) {
      setCookie("skull_king", null);
      return;
    }

    if (game?.status == GameStatus.gameOver) {
      return;
    }

    if (game?.id && me && !cookies.skull_king) {
      setCookie("skull_king", { gameId: game.id, me: { ...me } });
      return;
    }

    if (cookies.skull_king && !game?.id) {
      const { gameId, me } = cookies.skull_king;
      if (gameId && me) {
        setMe(me);
        startUpdateTimer(gameId);
      }

      // Always clear out the cookie once on reload to ensure that a
      // player isn't stuck trying to load a "dead game"
      setCookie("skull_king", null);
    }
  }, [
    cookies.skull_king,
    game?.id,
    game?.status,
    me,
    setCookie,
    startUpdateTimer,
  ]);

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
        setGame(result.data);
        startUpdateTimer(result.data?.id);
        setMe((result.data as Game).playerRoundInfo[0].player);
      }
    },
    [startUpdateTimer]
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
        startUpdateTimer(gameId);
        setMe(result.data);
      }
    },
    [startUpdateTimer]
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

  const startGame = useCallback(async () => {
    if (
      !game?.id ||
      game.playerRoundInfo?.length < 2 ||
      game.playerRoundInfo[0].player.id !== me?.id
    ) {
      console.log("Cannot start game");
      return;
    }

    const result = await callGetRoute(StartGameUri(game.id, me.id, game.hash));

    if (result.status !== 200) {
      console.log("Could not start game", result.status, result.statusText);
    } else {
      updateGame(game.id, currentHashRef.current ?? "");
    }
  }, [game?.hash, game?.id, game?.playerRoundInfo, me?.id, updateGame]);

  const showOptionalPopup = useCallback(() => {
    return game && game.status !== GameStatus.gameOver
      ? "Do you really want to stop playing?"
      : null;
  }, [game]);

  window.onbeforeunload = function () {
    return showOptionalPopup();
  };

  const moveToPreviousGameStatus = useCallback(async () => {
    if (!game || !me) {
      console.log("No game or player");
      return;
    }

    const result = await callGetRoute(
      GameMovePreviousPhaseUri(game.id, me.id, game.hash)
    );

    if (result.status !== 200) {
      console.log(
        "Could not move to previous phase",
        result.status,
        result.statusText
      );
    } else {
      updateGame(game.id, currentHashRef.current ?? "");
    }
  }, [game, me, updateGame]);

  const moveToNextGameStatus = useCallback(async () => {
    if (!game || !me) {
      console.log("No game or player");
      return;
    }

    const result = await callGetRoute(
      GameMoveNextPhaseUri(game.id, me.id, game.hash)
    );

    if (result.status !== 200) {
      console.log(
        "Could not move to next phase",
        result.status,
        result.statusText
      );
    } else {
      updateGame(game.id, currentHashRef.current ?? "");
    }
  }, [game, me, updateGame]);

  const exitGame = useCallback(() => {
    // Clear the cookie and clear the game
    // Stop listening for updates.
    setCookie("skull_king", null);
    setGame(null);
    setMe(undefined);
    clearInterval(timerRef.current!);
    timerRef.current = null;
    currentHashRef.current = undefined;
    setShowExitPopup(false);
  }, [setCookie]);

  return (
    <div className="App">
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
          createGame={!game ? createGame : undefined}
          joinGame={!game ? joinGame : undefined}
        />
        {game && game?.status !== GameStatus.acceptingPlayers && (
          <PlayArea
            game={game}
            me={me!}
            moveToNextGameStatus={moveToNextGameStatus}
            moveToPreviousGameStatus={moveToPreviousGameStatus}
          />
        )}
        {!game && (
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
    </div>
  );
};

export default App;

