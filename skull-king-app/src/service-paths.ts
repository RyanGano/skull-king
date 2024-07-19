const BaseGameUriInternal = "BASE_URI/games";

const CreateNewGameInternal = BaseGameUriInternal;
const GetGameInternal = `${BaseGameUriInternal}/GAME_ID/?knownHash=KNOWN_HASH`;
const StartGameInternal = `${BaseGameUriInternal}/GAME_ID/start`;
const GetGamePlayerInternal = `${BaseGameUriInternal}/GAME_ID/players`;

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

export function StartGameUri(gameId: string) {
  return formatUriString(StartGameInternal, [
    { key: "GAME_ID", value: gameId },
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
