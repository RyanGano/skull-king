import type { Round } from "../../types/game";

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
