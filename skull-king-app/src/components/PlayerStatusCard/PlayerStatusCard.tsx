import Stack from "react-bootstrap/esm/Stack";
import { useEffect, useState } from "react";
import { DashSquareFill, PlusSquareFill } from "react-bootstrap-icons";
import { SimpleModal } from "../../common/simple-modal";
import { GameStatus, PlayerRounds, Round } from "../../types/game";

const defaultBlueColor = "#DDDDFF";
const defaultGreenColor = "#DDFFDD";
const enabledButtonColor = "#AAAAFF";
const disabledButtonColor = "#CCCCCC";

export interface PlayerStatusCardProps {
  playerRounds: PlayerRounds;
  dealer?: boolean;
  turnPhase: GameStatus;
  onBidChange?: (newBid: number) => void;
  onScoreChange?: (taken: number, bonus: number) => void;
}

export const PlayerStatusCard = (props: PlayerStatusCardProps) => {
  const { playerRounds, dealer, onBidChange, onScoreChange, turnPhase } = props;
  const [showBidUI, setShowBidUI] = useState<boolean>(false);
  const [showScoreUI, setShowScoreUI] = useState<boolean>(false);
  const [currentBonus, setCurrentBonus] = useState<number>(0);
  const [currentTricksTaken, setCurrentTricksTaken] = useState<number>(0);

  useEffect(() => {
    setCurrentBonus(0);
    setCurrentTricksTaken(0);
  }, [turnPhase]);

  const getBidContent = () => {
    if (!playerRounds) {
      return null;
    }

    const children = [];

    const currentRound = playerRounds.rounds[playerRounds.rounds.length - 1];

    for (let i = 0; i <= currentRound.maxBid; i++) {
      children.push(
        <div
          key={i}
          style={{
            margin: 6,
            padding: 24,
            backgroundColor: defaultBlueColor,
            borderRadius: 12,
            minWidth: 70,
            display: "flex",
            justifyContent: "center",
            fontWeight: 800,
          }}
          onClick={
            onBidChange
              ? () => {
                  currentRound.bid = i;
                  setShowBidUI(false);
                  onBidChange(i);
                }
              : undefined
          }
        >
          {i}
        </div>
      );
    }
    return <div className={"d-flex flex-wrap"}>{children}</div>;
  };

  const getBonusUI = () => {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <DashSquareFill
          color={currentBonus > 0 ? enabledButtonColor : disabledButtonColor}
          size={36}
          onClick={() =>
            currentBonus > 0 ? setCurrentBonus(currentBonus - 10) : undefined
          }
        />
        <div
          style={{
            margin: 6,
            padding: 24,
            backgroundColor: defaultBlueColor,
            borderRadius: 12,
            maxWidth: 75,
            minWidth: 70,
            display: "flex",
            justifyContent: "center",
            fontWeight: 800,
          }}
        >
          {currentBonus}
        </div>
        <PlusSquareFill
          color={enabledButtonColor}
          size={36}
          onClick={() => setCurrentBonus(currentBonus + 10)}
        />
      </div>
    );
  };

  const getScoreContent = (currentRound: Round) => {
    if (!currentRound) {
      return <></>;
    }

    const tricksTaken = [];

    for (let i = 0; i <= currentRound.maxBid; i++) {
      tricksTaken.push(
        <div
          key={i}
          style={{
            margin: 6,
            padding: 24,
            backgroundColor:
              currentTricksTaken === i ? defaultGreenColor : defaultBlueColor,
            borderRadius: 12,
            minWidth: 70,
            display: "flex",
            justifyContent: "center",
            fontWeight: 800,
          }}
          onClick={() => setCurrentTricksTaken(i)}
        >
          {i}
        </div>
      );
    }

    return (
      <Stack>
        <span>Tricks Taken</span>
        <div className={"d-flex flex-wrap"}>{tricksTaken}</div>
        <span>Bonus Points</span>
        <div className={"d-flex flex-wrap"}>{getBonusUI()}</div>
      </Stack>
    );
  };

  const cancelAutoUI = () => {
    setShowBidUI(false);
    setShowScoreUI(false);
  };

  const saveScore = () => {
    onScoreChange?.(currentTricksTaken ?? 0, currentBonus);
    setShowScoreUI(false);
  };

  const currentRound = playerRounds.rounds[playerRounds.rounds.length - 1];

  return (
    <>
      <SimpleModal
        title={`Update Bid - ${playerRounds.player.name}`}
        content={<>{showBidUI && getBidContent()}</>}
        defaultButtonContent={"Cancel"}
        onAccept={() => cancelAutoUI()}
        onCancel={() => cancelAutoUI()}
        show={showBidUI}
      />
      <SimpleModal
        title={`Update Score - ${playerRounds.player.name} (bid ${currentRound.bid})`}
        content={<>{showScoreUI && getScoreContent(currentRound)}</>}
        defaultButtonContent={"Save Score"}
        onAccept={() => saveScore()}
        onCancel={() => cancelAutoUI()}
        show={showScoreUI}
      />
      <div
        style={{
          margin: 6,
          padding: 12,
          backgroundColor: dealer
            ? onBidChange
              ? defaultGreenColor
              : defaultBlueColor
            : onBidChange
            ? defaultBlueColor
            : defaultGreenColor,
          borderRadius: 12,
          minWidth: 150,
          minHeight: 100,
        }}
        onClick={() =>
          onBidChange
            ? setShowBidUI(true)
            : onScoreChange
            ? setShowScoreUI(true)
            : undefined
        }
      >
        <Stack>
          <h5>{playerRounds.player.name}</h5>
          <span style={{ fontWeight: 600 }}>{`Score: ${playerRounds.rounds
            .map((x) => calculateRoundScore(x))
            .reduce((a, b) => a + b, 0)}`}</span>
          {turnPhase === GameStatus.biddingOpen && (
            <p>
              {currentRound.maxBid !== 1 ? (
                <span>{`Last Round: ${calculateRoundScore(
                  currentRound
                )}`}</span>
              ) : (
                <br />
              )}
            </p>
          )}
          {turnPhase === GameStatus.biddingClosed && (
            <p>
              <span>{`Results: ${currentRound.tricksTaken} / ${currentRound.bonus}`}</span>
            </p>
          )}

          <h5>{`Bid: ${currentRound.bid ?? 0}`}</h5>
        </Stack>
      </div>
    </>
  );
};

const calculateRoundScore = (round: Round): number => {
  if (round.bid === round.tricksTaken) {
    const newScore =
      round.bid === 0
        ? round.maxBid * 10 + (round.bonus ?? 0)
        : (round.tricksTaken ?? 0) * 20 + (round.bonus ?? 0);

    return newScore;
  }

  if (round.bid === 0) return round.maxBid * -10 + (round.bonus ?? 0);

  return (
    Math.abs((round.tricksTaken ?? 0) - (round.bid ?? 0)) * -10 +
    (round.bonus ?? 0)
  );
};
