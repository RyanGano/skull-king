// Each player gets a secret token from the server when they create or join a
// game. It is the only thing that lets this device act as that player, so it
// is kept in this browser and sent with every game action. It is never part
// of the game the server sends to everyone, and never goes in the URL.

const keyFor = (gameId: string, playerId: string) =>
  `skullKing.playerToken.${gameId.toUpperCase()}.${playerId}`;

export const savePlayerToken = (
  gameId: string,
  playerId: string,
  token: string,
) => {
  try {
    localStorage.setItem(keyFor(gameId, playerId), token);
  } catch {
    // Storage unavailable (private mode, blocked) - the game still works for
    // this session through the in-memory copy; only a reload loses it
  }
};

export const loadPlayerToken = (
  gameId: string,
  playerId: string,
): string | undefined => {
  try {
    return localStorage.getItem(keyFor(gameId, playerId)) ?? undefined;
  } catch {
    return undefined;
  }
};

export const forgetPlayerToken = (gameId: string, playerId: string) => {
  try {
    localStorage.removeItem(keyFor(gameId, playerId));
  } catch {
    // Nothing to clean up
  }
};
