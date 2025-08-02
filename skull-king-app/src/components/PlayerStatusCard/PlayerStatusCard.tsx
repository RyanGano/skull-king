import Stack from "react-bootstrap/esm/Stack";
import { useEffect, useState } from "react";
import classNames from "classnames";
import { SimpleModal } from "../../common/simple-modal";
import { GameStatus, PlayerRounds, Round } from "../../types/game";
import Form from "react-bootstrap/Form";
import { calculateRoundScore } from "./utils";

import "./PlayerStatusCard.less";

interface BonusOption {
  id: string;
  label: string;
  points: number;
}

const BONUS_OPTIONS: BonusOption[] = [
  { id: "green14", label: "Green 14", points: 10 },
  { id: "yellow14", label: "Yellow 14", points: 10 },
  { id: "purple14", label: "Purple 14", points: 10 },
  { id: "black14", label: "Black 14", points: 20 },
  { id: "mermaid1", label: "Mermaid captured with a Pirate", points: 20 },
  { id: "mermaid2", label: "Mermaid captured with a Pirate", points: 20 },
  { id: "pirate1", label: "Pirate captured with the Skull King", points: 30 },
  { id: "pirate2", label: "Pirate captured with the Skull King", points: 30 },
  { id: "pirate3", label: "Pirate captured with the Skull King", points: 30 },
  { id: "pirate4", label: "Pirate captured with the Skull King", points: 30 },
  { id: "pirate5", label: "Pirate captured with the Skull King", points: 30 },
  { id: "pirate6", label: "Pirate captured with the Skull King", points: 30 },
  { id: "skullking", label: "Skull King captured with a Mermaid", points: 40 },
];

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
  const [selectedBonuses, setSelectedBonuses] = useState<string[]>([]);

  useEffect(() => {
    setCurrentBonus(0);
    setCurrentTricksTaken(0);
    setSelectedBonuses([]);
  }, [turnPhase, playerRounds.rounds.length]);

  // Update currentBonus when selectedBonuses changes
  useEffect(() => {
    const totalBonusPoints = selectedBonuses.reduce((total, bonusId) => {
      const option = BONUS_OPTIONS.find(opt => opt.id === bonusId);
      return total + (option?.points || 0);
    }, 0);
    setCurrentBonus(totalBonusPoints);
  }, [selectedBonuses]);

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

    const handleBonusChange = (optionId: string, checked: boolean) => {
      if (!allowBonus) return;
      
      if (checked) {
        setSelectedBonuses(prev => [...prev, optionId]);
      } else {
        setSelectedBonuses(prev => prev.filter(id => id !== optionId));
      }
    };

    return (
      <div className="bonusSelectionContainer">
        <Form.Select 
          disabled={!allowBonus}
          value=""
          onChange={(e) => {
            if (e.target.value && allowBonus) {
              const optionId = e.target.value;
              if (!selectedBonuses.includes(optionId)) {
                setSelectedBonuses(prev => [...prev, optionId]);
              }
            }
          }}
          className="bonusDropdown"
        >
          <option value="">Select bonus...</option>
          {BONUS_OPTIONS.map((option) => (
            <option 
              key={option.id} 
              value={option.id}
              disabled={selectedBonuses.includes(option.id)}
            >
              {option.label} ({option.points} pts)
            </option>
          ))}
        </Form.Select>
        
        <div className="selectedBonusesDisplay">
          {selectedBonuses.length > 0 ? (
            <div className="bonusListContainer">
              <div className="bonusHeader">Selected Bonuses:</div>
              {selectedBonuses.map((bonusId, index) => {
                const option = BONUS_OPTIONS.find(opt => opt.id === bonusId);
                return (
                  <div key={`${bonusId}-${index}`} className="selectedBonusItem">
                    <span>{option?.label} (+{option?.points})</span>
                    {allowBonus && (
                      <button
                        type="button"
                        className="removeBonusButton"
                        onClick={() => handleBonusChange(bonusId, false)}
                        title="Remove bonus"
                      >
                        ×
                      </button>
                    )}
                  </div>
                );
              })}
              <div className="bonusTotalDisplay">
                Total Bonus: {currentBonus} points
              </div>
            </div>
          ) : (
            <div className="noBonusDisplay">
              {allowBonus ? "No bonuses selected" : "No bonus available (bid not met)"}
            </div>
          )}
        </div>
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
              setSelectedBonuses([]);
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
