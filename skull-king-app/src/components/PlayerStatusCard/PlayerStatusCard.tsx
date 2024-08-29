import Stack from "react-bootstrap/esm/Stack";
import { useEffect, useState } from "react";
import { DashSquareFill, PlusSquareFill } from "react-bootstrap-icons";
import classNames from "classnames";
import { SimpleModal } from "../../common/simple-modal";
import { GameStatus, PlayerRounds, Round } from "../../types/game";

import "./PlayerStatusCard.less";

export interface PlayerStatusCardProps {
  playerRounds: PlayerRounds;
  isMe: boolean;
  myPlace?: number;
  dealer?: boolean;
  turnPhase: GameStatus;
  onBidChange?: (newBid: number) => void;
  onScoreChange?: (taken: number, bonus: number) => void;
}

export const PlayerStatusCard = (props: PlayerStatusCardProps) => {
  const {
    playerRounds,
    isMe,
    dealer,
    onBidChange,
    onScoreChange,
    turnPhase,
    myPlace,
  } = props;
  const [showBidUI, setShowBidUI] = useState<boolean>(false);
  const [showScoreUI, setShowScoreUI] = useState<boolean>(false);
  const [currentBonus, setCurrentBonus] = useState<number>(0);
  const [currentTricksTaken, setCurrentTricksTaken] = useState<number>(0);

  useEffect(() => {
    setCurrentBonus(0);
    setCurrentTricksTaken(0);
  }, [turnPhase, playerRounds.rounds.length]);

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
          className={classNames("numberDisplayBackground", {
            ["selected"]: currentRound.bid === i,
          })}
        >
          <div
            className="numberDisplayContainer"
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
        </div>
      );
    }
    return <div className="wrappingContainer">{children}</div>;
  };

  const getBonusUI = () => {
    const currentRound = playerRounds.rounds[playerRounds.rounds.length - 1];
    const allowBonus =
      currentRound?.bid === currentTricksTaken ||
      currentRound?.bid === currentRound.tricksTaken;

    return (
      <div className="bonusInputContainer">
        <DashSquareFill
          className={classNames("bonusChangeButton", {
            ["disabled"]: currentBonus <= 0,
          })}
          onClick={() =>
            currentBonus > 0 ? setCurrentBonus(currentBonus - 10) : undefined
          }
        />
        <div
          className={classNames("numberDisplayBackground", "disabled", {
            ["selected"]: currentBonus > 0,
          })}
        >
          <div
            style={{ "--width": "75px" } as React.CSSProperties}
            className="numberDisplayContainer"
          >
            {currentBonus}
          </div>
        </div>
        <PlusSquareFill
          className={classNames("bonusChangeButton", {
            ["disabled"]: !allowBonus,
          })}
          onClick={() =>
            allowBonus ? setCurrentBonus(currentBonus + 10) : undefined
          }
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
          className={classNames("numberDisplayBackground", {
            ["selected"]: currentTricksTaken === i,
          })}
          onClick={() => {
            setCurrentTricksTaken(i);
            if (i !== currentRound.bid) {
              setCurrentBonus(0);
            }
          }}
        >
          <div className="numberDisplayContainer">{i}</div>
        </div>
      );
    }

    return (
      <Stack>
        <span>Tricks Taken</span>
        <div className="wrappingContainer">{tricksTaken}</div>
        <span>Bonus Points</span>
        <div className="wrappingContainer">{getBonusUI()}</div>
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
        className={classNames(
          turnPhase !== GameStatus.gameOver
            ? "playerStatusBackground"
            : "playerStandingBackground",
          {
            ["disabled"]: !isMe,
            ["dealer"]: dealer,
            ["firstPlace"]: myPlace === 1,
            ["secondPlace"]: myPlace === 2,
            ["thirdPlace"]: myPlace === 3,
            ["loser01"]: myPlace === 4,
            ["loser02"]: myPlace === 5,
            ["loser03"]: myPlace === 6,
            ["loser04"]: myPlace === 7,
            ["loser05"]: myPlace === 8,
          }
        )}
      >
        <div
          className={classNames("playerStatusContainer", {
            ["disabled"]: !isMe,
            ["dealer"]: dealer,
          })}
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
            <span className="scoreText">{`Score: ${playerRounds.rounds
              .map((x) => calculateRoundScore(x))
              .reduce((a, b) => a + b, 0)}`}</span>
            {turnPhase === GameStatus.biddingOpen && (
              <p>
                {currentRound.maxBid !== 1 ? (
                  <span>{`Last Round: ${calculateRoundScore(
                    playerRounds.rounds.slice(-2)[0]
                  )}`}</span>
                ) : (
                  <br />
                )}
              </p>
            )}
            {turnPhase === GameStatus.biddingClosed && (
              <p>
                <span>{`Results: ${currentRound.tricksTaken ?? "..."} / ${
                  currentRound.bonus ?? "..."
                }`}</span>
              </p>
            )}

            {/* Bid hasn't been entered by this player yet. */}
            {turnPhase === GameStatus.biddingOpen &&
              currentRound.bid === null && <h5>{`Bid: ...`}</h5>}
            {/* Bid has been entered (only show if it's my bid). */}
            {turnPhase === GameStatus.biddingOpen &&
              currentRound.bid !== null && (
                <h5>{`Bid: ${isMe ? currentRound.bid ?? 0 : "?"}`}</h5>
              )}
            {/* All bids are public and round is starting. */}
            {turnPhase === GameStatus.biddingClosed && (
              <h5>{`Bid: ${currentRound.bid ?? 0}`}</h5>
            )}
          </Stack>
        </div>
      </div>
    </>
  );
};

export const calculateRoundScore = (round: Round): number => {
  // If the round hasn't been scored yet, just return 0;
  if (round.tricksTaken === null) {
    return 0;
  }

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
