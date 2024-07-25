const BaseGameUriInternal = "BASE_URI/games";

const CreateNewGameInternal = BaseGameUriInternal;
const GetGameInternal = `${BaseGameUriInternal}/GAME_ID/?knownHash=KNOWN_HASH`;
const StartGameInternal = `${BaseGameUriInternal}/GAME_ID/start?playerId=PLAYER_ID&knownHash=KNOWN_HASH`;
const GetGamePlayerInternal = `${BaseGameUriInternal}/GAME_ID/players`;
const GameMoveNextPhaseInternal = `${BaseGameUriInternal}/GAME_ID/movenext?playerId=PLAYER_ID&knownHash=KNOWN_HASH`;
const GameMovePreviousPhaseInternal = `${BaseGameUriInternal}/GAME_ID/moveprevious?playerId=PLAYER_ID&knownHash=KNOWN_HASH`;
const GameSetBidInternal = `${BaseGameUriInternal}/GAME_ID/setbid?playerId=PLAYER_ID&bid=BID&knownHash=KNOWN_HASH`;
const GameSetScoreInternal = `${BaseGameUriInternal}/GAME_ID/setscore?playerId=PLAYER_ID&trickstaken=TRICKS_TAKEN&bonus=BONUS&knownHash=KNOWN_HASH`;

const CurrentBaseUri = import.meta.env.VITE_REACT_APP_BASE_SERVICE_URI;

function formatUriString(
  input: string,
  variables: { key: string; value: string }[] | undefined
) {
  let currentString = input.replace("BASE_URI", CurrentBaseUri);
  variables?.forEach(
    (x) => (currentString = currentString.replace(x.key, x.value))
  );
  return currentString;
}

function getUriString(input: string) {
  return formatUriString(input, undefined);
}

export function CreateNewGameUri() {
  return getUriString(CreateNewGameInternal);
}

export function GetGameUri(gameId: string, currentHash?: string) {
  return formatUriString(GetGameInternal, [
    { key: "GAME_ID", value: gameId },
    { key: "KNOWN_HASH", value: currentHash ?? "" },
  ]);
}

export function StartGameUri(
  gameId: string,
  playerId: string,
  currentHash: string
) {
  return formatUriString(StartGameInternal, [
    { key: "GAME_ID", value: gameId },
    { key: "PLAYER_ID", value: playerId },
    { key: "KNOWN_HASH", value: currentHash },
  ]);
}

export function AddPlayerUri(gameId: string) {
  return formatUriString(GetGamePlayerInternal, [
    { key: "GAME_ID", value: gameId },
  ]);
}

export function EditPlayerUri(gameId: string) {
  return formatUriString(GetGamePlayerInternal, [
    { key: "GAME_ID", value: gameId },
  ]);
}

export function GameMoveNextPhaseUri(
  gameId: string,
  playerId: string,
  currentHash: string
) {
  return formatUriString(GameMoveNextPhaseInternal, [
    { key: "GAME_ID", value: gameId },
    { key: "PLAYER_ID", value: playerId },
    { key: "KNOWN_HASH", value: currentHash },
  ]);
}

export function GameMovePreviousPhaseUri(
  gameId: string,
  playerId: string,
  currentHash: string
) {
  return formatUriString(GameMovePreviousPhaseInternal, [
    { key: "GAME_ID", value: gameId },
    { key: "PLAYER_ID", value: playerId },
    { key: "KNOWN_HASH", value: currentHash },
  ]);
}

export function GameSetBidUri(
  gameId: string,
  playerId: string,
  bid: number,
  currentHash: string
) {
  return formatUriString(GameSetBidInternal, [
    { key: "GAME_ID", value: gameId },
    { key: "PLAYER_ID", value: playerId },
    { key: "BID", value: bid.toString() },
    { key: "KNOWN_HASH", value: currentHash },
  ]);
}

export function GameSetScoreUri(
  gameId: string,
  playerId: string,
  tricksTaken: number,
  bonus: number,
  currentHash: string
) {
  return formatUriString(GameSetScoreInternal, [
    { key: "GAME_ID", value: gameId },
    { key: "PLAYER_ID", value: playerId },
    { key: "TRICKS_TAKEN", value: tricksTaken.toString() },
    { key: "BONUS", value: bonus.toString() },
    { key: "KNOWN_HASH", value: currentHash },
  ]);
}
