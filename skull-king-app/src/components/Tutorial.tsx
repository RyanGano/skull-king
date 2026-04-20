import React, { useState, useEffect, useMemo } from "react";
import { Button } from "react-bootstrap";
import "./Tutorial.less";
import { TutorialContext } from "../TutorialContext";

enum TipPosition {
  top,
  bottom,
  left,
  right,
}

interface TutorialStep {
  title: string;
  description: string;
  highlightSelector?: string;
  position?: TipPosition;
  tips?: string[];
}

interface TutorialProps {
  show: boolean;
  onClose: () => void;
  onComplete?: () => void;
  context: TutorialContext;
  playerCount?: number;
  iAmCaptain?: boolean;
  isRandomBid?: boolean;
}

const getTutorialSteps = (
  context: TutorialContext,
  playerCount?: number,
  iAmCaptain?: boolean,
  isRandomBid?: boolean,
): TutorialStep[] => {
  // Define all tutorial step arrays as named constants
  const homeSteps: TutorialStep[] = [
    {
      title: "Ahoy, Matey!",
      description:
        "This be a scorin' app fer the Skull King card game, ye scurvy dog!",
      highlightSelector: ".gameButton",
      position: TipPosition.bottom,
    },
    {
      title: "Start Yer Own Crew",
      description:
        "Click 'New Game' to start a new voyage and become the captain o' this ship!",
      highlightSelector: ".gameButton:first-child",
      position: TipPosition.bottom,
      tips: [
        "Ye'll be able to invite yer mates to join with a secret game code",
      ],
    },
    {
      title: "Join the Crew",
      description:
        "Click 'Join Game' to join an existin' crew usin' the code from yer captain.",
      highlightSelector: ".gameButton:last-child",
      position: TipPosition.bottom,
      tips: ["Ye'll need the secret game code shared by the captain"],
    },
  ];

  const createGameSteps: TutorialStep[] = [
    {
      title: "What Be Yer Name?",
      description:
        "Type yer name to identify yerself in the game, ye landlubber!",
      highlightSelector: ".textInputArea input",
      position: TipPosition.bottom,
      tips: ["Choose a name yer mates will recognize"],
    },
  ];

  const joinGameSteps: TutorialStep[] = [
    {
      title: "Enter the Secret Code",
      description: "Type the secret game code shared by the captain, matey!",
      highlightSelector: ".textInputArea input:first-child",
      position: TipPosition.bottom,
      tips: [
        "The code be usually 4 uppercase letters, like a pirate's treasure map",
      ],
    },
    {
      title: "What Be Yer Name?",
      description: "Type yer name to join the crew, ye swab!",
      highlightSelector: ".textInputArea input:last-child",
      position: TipPosition.bottom,
      tips: ["Choose a unique name fer yerself"],
    },
    {
      title: "Board the Ship!",
      description: "Click 'Join' to enter the game and join the crew.",
      highlightSelector: ".modal-footer .btn-primary",
      position: TipPosition.bottom,
      tips: ["Get ready to sail the seven seas with yer fellow pirates!"],
    },
  ];

  const startGameOptionsSteps: TutorialStep[] = [
    {
      title: "Choose Yer Game Mode",
      description:
        "Ye have two options to start yer game. Let's explore both paths, matey!",
      highlightSelector: ".start-game-button",
      position: TipPosition.bottom,
    },
    {
      title: "Start Game - Manual Biddin'",
      description:
        "Players manually enter their bids and round results usin' their phones.",
      highlightSelector: ".start-game-button",
      position: TipPosition.bottom,
      tips: [
        "Players decide how many tricks they'll win each round",
        "Requires active participation from all crew members",
        "Traditional Skull King experience, like sailin' the old seas",
      ],
    },
    {
      title: "Start Game with Auto Bid",
      description:
        "The system randomly assigns bids to each player automatically, like drawin' lots!",
      highlightSelector: ".auto-bid-button",
      position: TipPosition.bottom,
      tips: [
        "Focus more on strategy and card play",
        "Less emphasis on biddin' decisions",
        "Can be more fun and unpredictable, like a storm at sea",
        "Great fer faster-paced voyages",
      ],
    },
  ];

  const startingAutoBidSteps: TutorialStep[] = [
    {
      title: "Easy Difficulty",
      description:
        "The bid total will be exactly the number o' tricks available - perfect fer beginners!",
      highlightSelector: ".easy-button",
      position: TipPosition.bottom,
      tips: [
        "Predictable biddin' - no surprises here, matey",
        "Good fer learnin' the game mechanics",
        "All players' bids will add up to the exact number o' tricks available",
        "Don't include the Kraken in this mode - it be too unpredictable!",
      ],
    },
    {
      title: "Medium Difficulty",
      description:
        "The bid total will be somewhere between one under and one over the actual tricks.",
      highlightSelector: ".medium-button",
      position: TipPosition.bottom,
      tips: [
        "Balanced challenge - not too easy, not too hard",
        "Adds some strategy to the biddin' phase",
        "Bids can be 1 under or 1 over the total tricks available",
      ],
    },
    {
      title: "Hard Difficulty",
      description:
        "The bid total can be up to 2 over or under yer actual tricks - beware the Kraken!",
      highlightSelector: ".hard-button",
      position: TipPosition.bottom,
      tips: [
        "Maximum unpredictability - true pirate adventure",
        "Bids can vary wildly from the actual trick count",
        "Fer experienced captains only, ye brave souls",
      ],
    },
  ];

  const waitingForPlayersSteps: TutorialStep[] = [
    {
      title: "Waitin' fer the Crew",
      description:
        "This be the waitin' room where all players will appear once they join yer crew.",
      highlightSelector: ".gameInfoContainer",
      position: TipPosition.bottom,
      tips: ["Players will be listed here as they join yer pirate crew"],
    },
    {
      title: "Secret Game Code",
      description:
        "Share this secret code with yer mates so they can join the voyage.",
      highlightSelector: ".gameIdDisplay",
      position: TipPosition.bottom,
      tips: ["Anyone with this code can join yer crew"],
    },
    {
      title: "Share the Treasure Map",
      description:
        "Click the share button to send a direct link to yer game, like a treasure map!",
      highlightSelector: ".shareFloating",
      position: TipPosition.bottom,
      tips: [
        "Mates can click the link and just enter their name to join the crew",
      ],
    },
    {
      title: "Abandon Ship",
      description:
        "Click the skeleton to leave the game at any time, ye coward!",
      highlightSelector: ".exitGameButton",
      position: TipPosition.bottom,
      tips: [
        "Ye can always abandon ship if needed, but that's not very pirate-like",
      ],
    },
  ];

  const readingTheGameStatusSteps: TutorialStep[] = [
    {
      title: "Crew Member Cards",
      description:
        "Each card shows a player's name, score, and current bid, like a wanted poster!",
      highlightSelector: ".playerStatusCardContainer",
      position: TipPosition.bottom,
      tips: [
        "Yer card be colored - it shows yer current score, bid, and the last round results.",
        "A crew member's card'll say 'Bid: READY' when they're ready.'",
        "Scurvy dogs show 'Bid:' when they haven't bid yet",
      ],
    },
    {
      title: "Round Status",
      description: "Check how many rounds the battle has raged",
      highlightSelector: ".gameStatusText",
      position: TipPosition.top,
      tips: [
        "Biddin' Open: Players be enterin' their bids.",
        "Biddin' Closed: All bids be in, play yer cards",
        "The number shows which round ye're currently in, matey",
      ],
    },
  ];

  const autoBidReminderStep: TutorialStep[] = [
    {
      title: "No Biddin' Needed",
      description:
        "Ye be playin' a game with auto-bid. So you'll be playing cards more and biddin' less.",
      highlightSelector: ".playerStatusCardContainer",
      position: TipPosition.bottom,
      tips: [
        "The bids be assigned automatically by the system",
        "Try t' match the bid as closely as possible.",
      ],
    },
  ];

  const biddingSteps: TutorialStep[] = [
    {
      title: "Biddin' Phase",
      description:
        "It be time to bid, ye scurvy dog! Click on yer player card to enter yer bid.",
      highlightSelector: ".playerStatusCardContainer",
      position: TipPosition.bottom,
      tips: [
        "Tap yer card to open the bid selection, matey",
        "Bid from 0 to the number o' cards in this round",
        "Try to bid accurately fer bonus points, or walk the plank!",
        "Once all crew members card's show 'Bid: READY' we'll proceed, arr!",
      ],
    },
  ];

  const playingSteps: TutorialStep[] = [
    {
      title: "Playin' Cards",
      description:
        "Play yer cards strategically to win yer bid, ye cunning pirate!",
      highlightSelector: ".cardArea",
      position: TipPosition.bottom,
      tips: [
        "Lead with yer strongest cards, matey",
        "Pay attention to what the other scurvy dogs play",
        "Try to win exactly as many tricks as ye bid, or walk the plank!",
      ],
    },
    {
      title: "Round Scorin's",
      description:
        "Scores be calculated at the end o' each round, ye treasure hunters!",
      highlightSelector:
        ".playerStatusCardContainer:first-child .playerStatusBackground",
      position: TipPosition.bottom,
      tips: [
        "Exact bid = bonus points + trick points, arr!",
        "Over/under yer bid = negative points, ye fool!",
        "Special cards have different point values, keep yer eyes peeled",
      ],
    },
  ];

  const captainNavigationSteps: TutorialStep[] = [
    {
      title: "Captain's got the helm!",
      description:
        "Arrr! As captain o' this voyage, ye control the ship's timing!",
      highlightSelector:
        ".playerStatusCardContainer:first-child .playerStatusBackground",
      position: TipPosition.bottom,
      tips: [
        "When yer crew all says 'Bid: READY', ye can move to the playin' phase!",
        "When ever' crew member enters their score after playing, move to the next round.",
      ],
    },
    {
      title: "Previous Round",
      description:
        "Review previous rounds or correct any mistakes, ye careful captain!",
      highlightSelector: ".gameStatusNavButton.previous",
      position: TipPosition.bottom,
    },
    {
      title: "Next Round",
      description:
        "Advance to the next round when yer crew be ready, full speed ahead!",
      highlightSelector: ".gameStatusNavButton.next",
      position: TipPosition.bottom,
    },
  ];

  const captainAutoBidSteps: TutorialStep[] = [
    {
      title: "Captain's Choice",
      description:
        "Arrr! As captain o' this auto-bid voyage, ye control the ship's timing!",
      highlightSelector:
        ".playerStatusCardContainer:first-child .playerStatusBackground",
      position: TipPosition.bottom,
      tips: ["Watch fer all players Results to update before movin' on."],
    },
    {
      title: "Previous Round",
      description:
        "Review previous rounds or correct any mistakes, ye careful captain!",
      highlightSelector: ".gameStatusNavButton.previous",
      position: TipPosition.bottom,
    },
    {
      title: "Next Round",
      description:
        "Advance to the next round when yer crew be ready, full speed ahead!",
      highlightSelector: ".gameStatusNavButton.next",
      position: TipPosition.bottom,
    },
  ];

  const initialPromptSteps: TutorialStep[] = [
    {
      title: "Ahoy, New Pirate!",
      description:
        "Welcome aboard the Skull King adventure! Would ye like a guided tour of the ship?",
      position: TipPosition.top,
      tips: [
        "Click 'Aye' to start the tutorial and learn the ways of the sea",
        "Click 'Nay' to skip and dive right into the action",
        "Ye can always access tutorials later using the (?) below",
      ],
    },
  ];

  switch (context) {
    case TutorialContext.home:
      return homeSteps;

    case TutorialContext.createGame:
      return createGameSteps;

    case TutorialContext.joinGame:
      return joinGameSteps;

    case TutorialContext.inGame:
      // Show start game options tutorial only to the captain when there are 2+ players
      if (playerCount && playerCount > 1 && iAmCaptain) {
        return startGameOptionsSteps;
      } else {
        // Show waiting room tutorial to everyone else
        return waitingForPlayersSteps;
      }

    case TutorialContext.bidding:
      return [
        ...readingTheGameStatusSteps,
        ...(iAmCaptain ? captainNavigationSteps : []),
        ...biddingSteps,
      ];

    case TutorialContext.playing:
      return [
        ...readingTheGameStatusSteps,
        ...(isRandomBid ? autoBidReminderStep : []),
        ...playingSteps,
        ...(iAmCaptain && isRandomBid ? captainAutoBidSteps : []),
      ];

    case TutorialContext.startGameOptions:
      return startGameOptionsSteps;

    case TutorialContext.startingAutoBid:
      return startingAutoBidSteps;

    case TutorialContext.initialPrompt:
      return initialPromptSteps;
  }
};

export const Tutorial: React.FC<TutorialProps> = ({
  show,
  onClose,
  onComplete,
  context,
  playerCount,
  iAmCaptain,
  isRandomBid,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const [highlightedElement, setHighlightedElement] = useState<Element | null>(
    null,
  );
  const highlightedElementRef = React.useRef<Element | null>(null);
  const tooltipRef = React.useRef<HTMLDivElement>(null);

  const steps = useMemo(
    () => getTutorialSteps(context, playerCount, iAmCaptain, isRandomBid),
    [context, playerCount, iAmCaptain, isRandomBid],
  );

  // Reset to first step when context changes
  useEffect(() => {
    setCurrentStep(0);
  }, [context]);

  // Update tooltip position when step changes or tooltip is rendered
  useEffect(() => {
    const updatePosition = () => {
      if (show && steps[currentStep] && tooltipRef.current) {
        const step = steps[currentStep];

        // Special handling for initialPrompt - center on screen when no highlightSelector
        if (
          context === TutorialContext.initialPrompt &&
          !step.highlightSelector
        ) {
          const tooltipRect = tooltipRef.current.getBoundingClientRect();
          const viewportWidth = window.innerWidth;
          const viewportHeight = window.innerHeight;

          setTooltipPosition({
            top: Math.max(10, (viewportHeight - tooltipRect.height) / 2),
            left: Math.max(10, (viewportWidth - tooltipRect.width) / 2),
          });
          return;
        }

        // Normal positioning logic for steps with highlightSelector
        if (highlightedElement) {
          const rect = highlightedElement.getBoundingClientRect();
          const tooltipRect = tooltipRef.current.getBoundingClientRect();
          const step = steps[currentStep];
          const position = step.position || TipPosition.top;

          // Check if tooltip has valid dimensions (not 0)
          if (tooltipRect.width === 0 || tooltipRect.height === 0) {
            // Fallback: position below the element
            setTooltipPosition({
              top: rect.bottom + 10,
              left: rect.left + rect.width / 2 - 150, // Assume ~300px width / 2
            });
            return;
          }

          let top = 0;
          let left = 0;

          // Calculate initial position based on requested position
          switch (position) {
            case TipPosition.top:
              top = rect.top - tooltipRect.height - 10;
              left = rect.left + rect.width / 2 - tooltipRect.width / 2;
              break;
            case TipPosition.bottom:
              top = rect.bottom + 10;
              left = rect.left + rect.width / 2 - tooltipRect.width / 2;
              break;
            case TipPosition.left:
              top = rect.top + rect.height / 2 - tooltipRect.height / 2;
              left = rect.left - tooltipRect.width - 10;
              break;
            case TipPosition.right:
              top = rect.top + rect.height / 2 - tooltipRect.height / 2;
              left = rect.right + 10;
              break;
          }

          // Check if tooltip fits in the requested position
          const viewportWidth = window.innerWidth;
          const viewportHeight = window.innerHeight;
          const fitsCurrentPosition =
            top >= 10 && top + tooltipRect.height <= viewportHeight - 10;

          // If tooltip doesn't fit in requested position, try the opposite position
          if (!fitsCurrentPosition) {
            if (position === TipPosition.bottom) {
              // Try positioning above instead
              const topAbove = rect.top - tooltipRect.height - 10;
              if (topAbove >= 10) {
                top = topAbove;
              } else {
                // If neither position works, position at bottom of viewport
                top = viewportHeight - tooltipRect.height - 10;
              }
            } else if (position === TipPosition.top) {
              // Try positioning below instead
              const topBelow = rect.bottom + 10;
              if (topBelow + tooltipRect.height <= viewportHeight - 10) {
                top = topBelow;
              } else {
                // If neither position works, position at top of viewport
                top = 10;
              }
            }
          }

          // Ensure horizontal positioning stays within viewport
          if (left < 10) left = 10;
          if (left + tooltipRect.width > viewportWidth - 10) {
            left = viewportWidth - tooltipRect.width - 10;
          }

          setTooltipPosition({ top, left });
        }
      }
    };

    updatePosition();
  }, [show, currentStep, steps, highlightedElement, context]);

  // Reset to first step when context changes
  useEffect(() => {
    setCurrentStep(0);
  }, [context]);

  useEffect(() => {
    // Clear any existing highlights first
    if (highlightedElementRef.current) {
      highlightedElementRef.current.classList.remove("tutorial-highlight");
    }

    if (show && steps[currentStep]) {
      const step = steps[currentStep];
      if (step.highlightSelector) {
        const element = document.querySelector(step.highlightSelector);
        if (element) {
          // Found the element - highlight it
          element.classList.add("tutorial-highlight");
          element.scrollIntoView({ behavior: "smooth", block: "center" });
          highlightedElementRef.current = element;
          setHighlightedElement(element);
        } else {
          // Element not found - clear state
          highlightedElementRef.current = null;
          setHighlightedElement(null);
        }
      } else {
        // No highlight selector - clear state
        highlightedElementRef.current = null;
        setHighlightedElement(null);
      }
    } else {
      // Tutorial not showing - clear state
      highlightedElementRef.current = null;
      setHighlightedElement(null);
    }

    return () => {
      if (highlightedElementRef.current) {
        highlightedElementRef.current.classList.remove("tutorial-highlight");
      }
    };
  }, [show, currentStep, steps]);

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Tutorial completed - call onComplete if provided, otherwise onClose
      if (onComplete) {
        onComplete();
      } else {
        onClose();
      }
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  if (!show || !steps[currentStep]) {
    return null;
  }

  const step = steps[currentStep];

  return (
    <>
      {/* Backdrop overlay */}
      <div className="tutorial-backdrop" onClick={onClose} />

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className="tutorial-tooltip"
        style={{
          top: `${tooltipPosition.top}px`,
          left: `${tooltipPosition.left}px`,
        }}
      >
        <div className="tutorial-tooltip-header">
          <h5>{step.title}</h5>
          <button className="tutorial-close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="tutorial-tooltip-body">
          <p>{step.description}</p>

          {step.tips && step.tips.length > 0 && (
            <div className="tutorial-tips">
              <h6>Tips:</h6>
              <ul>
                {step.tips.map((tip, index) => (
                  <li key={index}>{tip}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="tutorial-tooltip-footer">
          <div className="tutorial-step-indicator">
            {context === TutorialContext.initialPrompt
              ? ""
              : `${currentStep + 1} of ${steps.length}`}
          </div>

          <div className="tutorial-buttons">
            {context === TutorialContext.initialPrompt ? (
              <>
                <Button
                  className="btn-outline-secondary"
                  size="sm"
                  onClick={onClose}
                >
                  Nay
                </Button>
                <Button className="btn-primary" size="sm" onClick={nextStep}>
                  Aye, Show Me the Way!
                </Button>
              </>
            ) : (
              <>
                <div className="tutorial-button-placeholder">
                  {currentStep > 0 && (
                    <Button
                      className="btn-outline-secondary"
                      size="sm"
                      onClick={prevStep}
                    >
                      Previous
                    </Button>
                  )}
                </div>

                <Button className="btn-primary" size="sm" onClick={nextStep}>
                  {currentStep === steps.length - 1 ? "Finish" : "Next"}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
};
