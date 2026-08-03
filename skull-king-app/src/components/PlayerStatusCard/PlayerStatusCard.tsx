import Stack from "react-bootstrap/esm/Stack";
import { useEffect, useState } from "react";
import classNames from "classnames";
import { SimpleModal } from "../../common/simple-modal";
import { GameStatus, type PlayerRounds, type Round } from "../../types/game";
import Dropdown from "react-bootstrap/Dropdown";
import { calculateRoundScore } from "./utils";

import "./PlayerStatusCard.less";
import { TutorialContext } from "../../TutorialContext";

interface BonusOption {
  id: string;
  label: string;
  points: number;
  maxCount: number;
}

// Consolidated dropdown options with maxCount for each
const BONUS_OPTIONS: BonusOption[] = [
  { id: "color14", label: "Yellow/Green/Purple 14", points: 10, maxCount: 3 },
  { id: "special8", label: "Special 8", points: 5, maxCount: 4 },
  { id: "special7", label: "Special 7", points: -5, maxCount: 4 },
  { id: "black14", label: "Black 14", points: 20, maxCount: 1 },
  {
    id: "mermaid",
    label: "Mermaid captured with a Pirate",
    points: 20,
    maxCount: 2,
  },
  {
    id: "pirate",
    label: "Pirate captured with the Skull King",
    points: 30,
    maxCount: 7,
  },
  {
    id: "skullking",
    label: "Skull King captured with a Mermaid",
    points: 40,
    maxCount: 1,
  },
  {
    id: "firstmate",
    label: "First Mate captured by Skull King or Mermaid",
    points: 30,
    maxCount: 1,
  },
  {
    id: "davyjoneslocker",
    label: "Creature destroyed by Davy Jones' Locker",
    points: 20,
    maxCount: 3,
  },
  { id: "goldcoins", label: "Gold Coins", points: 20, maxCount: 2 },
];

export interface PlayerStatusCardProps {
  playerRounds: PlayerRounds;
  isMe: boolean;
  expansionEnabled?: boolean;
  myPlace?: number;
  dealer?: boolean;
  turnPhase: GameStatus;
  onBidChange?: (newBid: number) => void;
  onScoreChange?: (taken: number, bonus: number) => void;
  onTutorialContextChanged?: (context: TutorialContext) => void;
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
    onTutorialContextChanged,
  } = props;
  const { expansionEnabled } = props;
  const [showBidUI, setShowBidUI] = useState<boolean>(false);
  const [showScoreUI, setShowScoreUI] = useState<boolean>(false);
  const [currentBonus, setCurrentBonus] = useState<number>(0);
  const [currentTricksTaken, setCurrentTricksTaken] = useState<number>(0);
  // selectedBonuses: array of bonus ids (can have duplicates)
  const [selectedBonuses, setSelectedBonuses] = useState<string[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState<boolean>(false);

  useEffect(() => {
    setCurrentBonus(0);
    setCurrentTricksTaken(0);
    setSelectedBonuses([]);
  }, [turnPhase, playerRounds.rounds.length]);

  // Update currentBonus when selectedBonuses changes
  useEffect(() => {
    const totalBonusPoints = selectedBonuses.reduce((total, bonusId) => {
      const option = BONUS_OPTIONS.find((opt) => opt.id === bonusId);
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
        </div>,
      );
    }
    return <div className="wrappingContainer">{children}</div>;
  };

  const getBonusUI = () => {
    const currentRound = playerRounds.rounds[playerRounds.rounds.length - 1];
    const allowBonus =
      currentRound?.bid === currentTricksTaken ||
      currentRound?.bid === currentRound.tricksTaken;

    // Count how many times each bonus id is selected
    const bonusCounts: Record<string, number> = {};
    selectedBonuses.forEach((id) => {
      bonusCounts[id] = (bonusCounts[id] || 0) + 1;
    });

    // Apply expansion rules: adjust availability based on expansionEnabled
    const availableOptions = BONUS_OPTIONS.filter((option) => {
      // Copy base max count
      let max = option.maxCount;

      // Special rules when expansion is off
      if (!expansionEnabled) {
        if (option.id === "pirate") {
          // priate: max 6 without expansion, 7 with expansion
          max = 6;
        }
        if (option.id === "special8") {
          return false; // disable special8 without expansion
        }
        if (option.id === "special7") {
          return false; // disable special7 without expansion
        }
        if (option.id === "firstmate") {
          return false; // disable firstmate without expansion
        }
        if (option.id === "davyjoneslocker") {
          return false; // disable davyjoneslocker without expansion
        }
      } else {
        // expansion enabled: special rules
        if (option.id === "pirate") {
          max = 7;
        }
      }

      return (bonusCounts[option.id] || 0) < max;
    });

    const handleBonusSelect = (optionId: string) => {
      if (!allowBonus) return;
      setSelectedBonuses((prev) => [...prev, optionId]);
      setDropdownOpen(false); // close after each selection
    };

    const handleBonusRemove = (indexToRemove: number) => {
      if (!allowBonus) return;
      setSelectedBonuses((prev) =>
        prev.filter((_, idx) => idx !== indexToRemove),
      );
    };

    return (
      <div className="bonusSelectionContainer">
        <Dropdown
          show={dropdownOpen && allowBonus}
          onToggle={(isOpen) => setDropdownOpen(isOpen)}
        >
          <Dropdown.Toggle
            className="bonusDropdownToggle"
            disabled={!allowBonus}
          >
            Add bonus…
          </Dropdown.Toggle>

          <Dropdown.Menu className="bonusDropdownMenu">
            {availableOptions.length > 0 ? (
              availableOptions.map((option) => (
                <Dropdown.Item
                  key={option.id}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleBonusSelect(option.id);
                  }}
                  className="bonusDropdownItem"
                >
                  {option.label} (+{option.points})
                </Dropdown.Item>
              ))
            ) : (
              <Dropdown.Item disabled className="bonusDropdownItem">
                All bonuses selected
              </Dropdown.Item>
            )}
            <Dropdown.Divider />
            <Dropdown.Item
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDropdownOpen(false);
              }}
              className="bonusDropdownCloseItem"
            >
              Close
            </Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown>

        <div className="selectedBonusesDisplay">
          {selectedBonuses.length > 0 ? (
            <div className="bonusListContainer">
              {selectedBonuses.map((bonusId, index) => {
                const option = BONUS_OPTIONS.find((opt) => opt.id === bonusId);
                return (
                  <div
                    key={`${bonusId}-${index}`}
                    className="selectedBonusItem"
                  >
                    <span>
                      {option?.label} (+{option?.points})
                    </span>
                    {allowBonus && (
                      <button
                        type="button"
                        className="removeBonusButton"
                        onClick={() => handleBonusRemove(index)}
                        title="Remove bonus"
                      >
                        ×
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          ) : null}
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
              setDropdownOpen(false);
            }
          }}
        >
          <div className="numberDisplayContainer">{i}</div>
        </div>,
      );
    }

    const isBonusAvailable = currentTricksTaken == currentRound.bid;

    return (
      <Stack>
        <span>Tricks Taken</span>
        <div className="wrappingContainer">{tricksTaken}</div>
        <span>
          {isBonusAvailable ? `Bonus Points (${currentBonus})` : "No Bonus"}
        </span>
        {isBonusAvailable && (
          <div className="wrappingContainer">{getBonusUI()}</div>
        )}
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
          },
        )}
      >
        <div
          className={classNames("playerStatusContainer", {
            ["disabled"]: !isMe,
            ["dealer"]: dealer,
          })}
          onClick={() =>
            onBidChange
              ? (() => {
                  setShowBidUI(true);
                  onTutorialContextChanged?.(TutorialContext.bidding);
                })()
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
                    playerRounds.rounds.slice(-2)[0],
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
              currentRound.bid === null && <span>{`Bid:`}</span>}
            {/* Bid has been entered (only show if it's my bid). */}
            {turnPhase === GameStatus.biddingOpen &&
              currentRound.bid !== null && (
                <span>{`Bid: ${isMe ? (currentRound.bid ?? 0) : "READY"}`}</span>
              )}
            {/* All bids are public and round is starting. */}
            {turnPhase === GameStatus.biddingClosed && (
              <span>{`Bid: ${currentRound.bid ?? 0}`}</span>
            )}
          </Stack>
        </div>
      </div>
    </>
  );
};
