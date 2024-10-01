import { useCallback, useEffect, useRef, useState } from "react";
import { SimpleModal } from "../../common/simple-modal";
import { Stack } from "react-bootstrap";
import { TextInputArea } from "../../common/input-area/text-input-area";

import "./GameSetup.less";
import { callGetRoute } from "../../utils/api-utils";
import { GameGetSingleGameIdUri } from "../../service-paths";

interface GameSetupProps {
  createGame?: (playerName: string) => void;
  joinGame?: (gameId: string, playerName: string) => void;
}

export const GameSetup = (props: GameSetupProps) => {
  const { createGame, joinGame } = props;
  const [showCreateGameUI, setShowCreateGameUI] = useState<boolean>(false);
  const [showJoinGameUI, setShowJoinGameUI] = useState<boolean>(false);
  const [gameId, setGameId] = useState<string>();
  const [playerName, setPlayerName] = useState<string>();
  const [defaultGameId, setDefaultGameId] = useState<string>();
  const timerRef = useRef<NodeJS.Timeout | null>(null);

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

  useEffect(() => {
    if (timerRef?.current) {
      return;
    }

    checkForId();
    timerRef.current = setInterval(() => {
      checkForId();
    }, 1000);
  }, [checkForId]);

  const getCreateGameUI = () => {
    return (
      <TextInputArea
        startingValue={playerName}
        setNewValue={(newValue) => setPlayerName(newValue)}
        placeholder="Enter your name"
        onEnter={
          playerName?.length
            ? () => {
                createGame?.(playerName!);
                setShowCreateGameUI(false);
              }
            : undefined
        }
        isValid={(playerName?.length ?? 0) > 0}
        autoFocus={true}
      />
    );
  };

  const getJoinGameUI = () => {
    return (
      <Stack gap={2}>
        <TextInputArea
          startingValue={defaultGameId ?? gameId}
          setNewValue={(newValue) => setGameId(newValue)}
          placeholder="Game Id"
          onEnter={
            (gameId?.length ?? 0) === 4 && playerName?.length
              ? () => {
                  setDefaultGameId(undefined);
                  joinGame?.(gameId!, playerName!);
                  setShowJoinGameUI(false);
                }
              : undefined
          }
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
          placeholder="Enter your name"
          onEnter={
            (gameId?.length ?? 0) === 4 && playerName?.length
              ? () => {
                  joinGame?.(gameId!, playerName!);
                  setShowJoinGameUI(false);
                }
              : undefined
          }
          isValid={(playerName?.length ?? 0) > 0}
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
              createGame?.(playerName!);
              setShowCreateGameUI(false);
            }}
            onCancel={() => setShowCreateGameUI(false)}
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
              joinGame?.(gameId!, playerName!);
              setShowJoinGameUI(false);
            }}
            onCancel={() => setShowJoinGameUI(false)}
            allowAccept={!!playerName && gameId?.length === 4}
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
                {
                  <div
                    className="gameButton"
                    onClick={() => setShowCreateGameUI(true)}
                  ></div>
                }
                {
                  <div
                    className="gameButton"
                    onClick={() => setShowJoinGameUI(true)}
                  ></div>
                }
              </div>
            </div>
          </div>
        )}
      </Stack>
    </>
  );
};
