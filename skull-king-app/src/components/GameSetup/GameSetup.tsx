import { useCallback, useEffect, useRef, useState } from "react";
import { SimpleModal } from "../../common/simple-modal";
import { Stack } from "react-bootstrap";
import { TextInputArea } from "../../common/input-area/text-input-area";

import "./GameSetup.less";
import { callGetRoute } from "../../utils/api-utils";
import { GameGetSingleGameIdUri, GetGameUri } from "../../service-paths";

interface GameSetupProps {
  createGame?: (playerName: string) => void;
  joinGame?: (gameId: string, playerName: string) => void;
  onSetupModalChanged?: (open: boolean) => void;
}

export const GameSetup = (props: GameSetupProps) => {
  const { createGame, joinGame, onSetupModalChanged } = props;
  const [showCreateGameUI, setShowCreateGameUI] = useState<boolean>(false);
  const [showJoinGameUI, setShowJoinGameUI] = useState<boolean>(false);
  const [gameId, setGameId] = useState<string | undefined>();
  const [playerName, setPlayerName] = useState<string | undefined>();
  const [defaultGameId, setDefaultGameId] = useState<string | undefined>();
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const lastCheckedPathRef = useRef<string | null>(null);

  const checkForId = useCallback(async () => {
    const result = await callGetRoute(GameGetSingleGameIdUri());
    if (result.status === 200) {
      setDefaultGameId(result.data);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, []);

  // only depend on the specific callback prop to avoid recreating this
  const notifySetupChanged = useCallback(
    (open: boolean) => {
      onSetupModalChanged?.(open);
    },
    [onSetupModalChanged]
  );

  const openCreateUI = useCallback(() => {
    setShowCreateGameUI(true);
    notifySetupChanged(true);
  }, [notifySetupChanged]);

  const closeCreateUI = useCallback(() => {
    setShowCreateGameUI(false);
    notifySetupChanged(false);
  }, [notifySetupChanged]);

  const openJoinUI = useCallback(() => {
    setShowJoinGameUI(true);
    notifySetupChanged(true);
  }, [notifySetupChanged]);

  const closeJoinUI = useCallback(() => {
    setShowJoinGameUI(false);
    // clear default id after closing so subsequent opens behave normally
    setDefaultGameId(undefined);
    notifySetupChanged(false);
  }, [notifySetupChanged]);

  // Prefill game id when visiting /<GAME_ID>
  useEffect(() => {
    // If user navigates to /<GAME_ID> validate that the game exists before opening the join UI
    (async () => {
      try {
        const path = window.location.pathname.replace(/^\/+|\/+$/g, "");
        if (!path || path.length !== 4 || lastCheckedPathRef.current === path)
          return;

        lastCheckedPathRef.current = path;
        const id = path.toUpperCase();
        const result = await callGetRoute(GetGameUri(id));
        if (result.status === 200) {
          setDefaultGameId(id);
          setShowJoinGameUI(true);
          notifySetupChanged(true);
        }
      } catch (e) {
        // ignore any errors – don't open the modal
      }
    })();
  }, [notifySetupChanged]); // Include notifySetupChanged since it's used inside

  useEffect(() => {
    if (timerRef?.current) {
      return;
    }

    checkForId();
    timerRef.current = setInterval(() => {
      checkForId();
    }, 1000);
  }, [checkForId]);

  // create UI
  const getCreateGameUI = () => {
    return (
      <TextInputArea
        startingValue={playerName}
        setNewValue={(newValue) => setPlayerName(newValue)}
        placeholder="Enter your name"
        onEnter={(entered) => {
          const name = entered ?? playerName;
          if (name && name.length) {
            createGame?.(name);
            setShowCreateGameUI(false);
          }
        }}
        isValid={(playerName?.length ?? 0) > 0}
        autoFocus={true}
      />
    );
  };

  // join UI: Game Id field (auto uppercase) then name field. If defaultGameId exists,
  // we focus the name field so user can immediately type their name.
  const getJoinGameUI = () => {
    return (
      <Stack gap={2}>
        {defaultGameId ? (
          <div
            style={{ fontSize: "1.2rem", color: "#000", padding: "0.375rem 0" }}
          >
            Game ID: {defaultGameId}
          </div>
        ) : (
          <TextInputArea
            startingValue={defaultGameId ?? gameId}
            setNewValue={(newValue) => setGameId(newValue)}
            placeholder="Game Id"
            inputFormatter={(textWithSelection) => ({
              ...textWithSelection,
              value: textWithSelection.value.toUpperCase(),
            })}
            onEnter={(entered) => {
              const gid = (entered ?? gameId) as string | undefined;
              // if gid and name present, join
              if ((gid?.length ?? 0) === 4 && (playerName?.length ?? 0) > 0) {
                setDefaultGameId(undefined);
                joinGame?.(gid!, playerName!);
                closeJoinUI();
              }
            }}
            isValid={((defaultGameId ?? gameId)?.length ?? 0) === 4}
            autoFocus={!defaultGameId}
          />
        )}

        <TextInputArea
          startingValue={playerName}
          setNewValue={(newValue) => setPlayerName(newValue)}
          placeholder="Enter your name"
          onEnter={(entered) => {
            const name = entered ?? playerName;
            const gid = gameId ?? defaultGameId;
            if ((gid?.length ?? 0) === 4 && (name?.length ?? 0) > 0) {
              joinGame?.(gid!, name!);
              closeJoinUI();
            }
          }}
          isValid={(playerName?.length ?? 0) > 0}
          // if defaultGameId exists (we came via link) focus name
          autoFocus={!!defaultGameId}
        />
      </Stack>
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
              if (playerName) createGame?.(playerName);
              closeCreateUI();
            }}
            onCancel={() => closeCreateUI()}
            allowAccept={!!playerName}
            show={true}
            centered={false}
            fullScreen={false}
          />
        )}

        {showJoinGameUI && (
          <SimpleModal
            title={"Join Game"}
            content={getJoinGameUI()}
            defaultButtonContent={"Join"}
            onAccept={() => {
              const gid = gameId ?? defaultGameId;
              if (!gid || !playerName) return;
              setDefaultGameId(undefined);
              joinGame?.(gid, playerName!);
              closeJoinUI();
            }}
            onCancel={() => closeJoinUI()}
            allowAccept={
              !!playerName && (gameId ?? defaultGameId)?.length === 4
            }
            show={true}
            centered={false}
            fullScreen={false}
          />
        )}

        {createGame && joinGame && (
          <div className="gameSetupContainer">
            <div className="imageContainer">
              <img
                src="/images/banner.png"
                alt="Start or join a battle!"
                className="bannerImage"
              />

              <div className="buttonsContainer">
                <div
                  className="gameButton"
                  onClick={() => openCreateUI()}
                ></div>
                <div className="gameButton" onClick={() => openJoinUI()}></div>
              </div>
            </div>
          </div>
        )}
      </Stack>
    </>
  );
};
