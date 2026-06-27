# Terms

A dictionary of the domain terms used across the Skull King app, in both the C# backend (`skull-king-service/`) and the TypeScript frontend (`skull-king-app/`). When adding code or docs, link back here rather than re-explaining a term.

## Game structure

- **Game** — the aggregate root for one play session. Holds the player list, a `Status`, and game options (`IsRandomBid`, `Difficulty`, `ExpansionEnabled`). A game runs exactly **10 rounds** and is identified by a [Game ID](#game-id).
- **Game ID** — a short, human-friendly code used to find/join a game (e.g. `ABCD`). Normalizes look-alike characters so a typed `O`/`I` resolves to `0`/`1`. The names `__Sample Game 1__` / `__Sample Game 2__` force the fixed IDs `ABCD` / `1234` for testing.
- **Player** — a participant, identified by a `Guid` and a display name.
- **Captain** — the **first player** in the game's player list (the game's owner/creator). Only the captain can start the game, add/remove other players, and reorder players. The captain cannot leave while other players remain ("cannot abandon ship").
- **Ghost Player** — an auto-added filler player named `"Ghost Player"`, inserted when [Random Bid](#random-bid-mode) mode is started with fewer than 3 players (random bid needs at least 3).
- **Round** — one of the 10 rounds within a game. Each round has a [Max Bid](#max-bid), plus a player's [Bid](#bid), [Tricks Taken](#tricks-taken), and [Bonus](#bonus).
- **PlayerRounds** — the per-player record tying a `Player` to their ordered list of `Round`s. The backend domain type is `PlayerRounds`; on the wire it is `playerRoundInfo`.

## Game status / phases

`GameStatus` is the state machine a game moves through (`MoveToNextPhase` / `MoveToPreviousPhase`):

- **AcceptingPlayers** — pre-game lobby; players can join, be removed, and be reordered. The only phase in which the roster can change.
- **BiddingOpen** — the current round accepts bids. Advancing defaults any missing bid to 0.
- **BiddingClosed** — bids are locked; the round accepts scores ([Tricks Taken](#tricks-taken) and [Bonus](#bonus)). Advancing from the 10th round's BiddingClosed ends the game.
- **GameOver** — all 10 rounds scored. Can be [Reset](#reset) to play again.

## Bidding & scoring

- **Bid** — how many [tricks](#trick) a player predicts they will win in a round. Must be between 0 and the round's [Max Bid](#max-bid).
- **Max Bid** — the maximum legal bid for a round, normally equal to the round number (round 1 → 1 … round 10 → 10). Capped at 8 for an 8-player game; the 9-player expansion allows up to 9 in middle rounds.
- **Trick** — a single hand won in the card game. (Conceptual — the app tracks counts, not individual cards.)
- **Tricks Taken** — how many tricks the player actually won that round. Between 0 and Max Bid.
- **Bonus** — extra/penalty points entered for a round, only allowed when [Bid](#bid) equals [Tricks Taken](#tricks-taken) (a met bid) and must be a multiple of 5. Defaults to 0.
- **Score** (per round, `Round.GetScore()`):
  - Bid met (bid == tricks taken): a non-zero bid scores `bid × 20 + bonus`; a bid of 0 met scores `MaxBid × 10 + bonus`.
  - Bid missed (bid != tricks taken): a non-zero bid loses `|bid − tricksTaken| × 10`; a bid of 0 missed loses `MaxBid × 10`.

## Game options

- **Random Bid mode** (`IsRandomBid`) — the app assigns bids automatically each round instead of players entering them. Requires at least 3 players (a [Ghost Player](#ghost-player) is added otherwise) and uses [Difficulty](#difficulty) to spread the total bids around the number of tricks.
- **Difficulty** (`GameDifficulty`: Easy / Medium / Hard) — only relevant in Random Bid mode; widens how far the random total bid can deviate from the number of available tricks (Easy = tightest, Hard = widest).
- **Expansion** (`ExpansionEnabled`) — enables the Skull King expansion rules; raises the max player count from 8 to 9.
- **Reset / Restart** — from GameOver, rewinds the game to round 1 / BiddingOpen, clearing all bids and scores so the same crew can replay.

## Sync & networking

- **Hash / knownHash** — an optimistic-concurrency token: a hash of the game's serialized state stored server-side in the `Hashes` table. Clients send the hash they last saw as `knownHash`. A `GET` with a matching hash returns **304 Not Modified**; a mutation with a stale hash is rejected (**409 Conflict** / **412 Precondition Failed**), prompting the client to re-fetch and retry. See [ARCHITECTURE.md](ARCHITECTURE.md#optimistic-concurrency-via-hashing).
- **Polling** — the client re-fetches the game once per second while in a game, relying on `knownHash`/304 to avoid unnecessary re-renders. There are no websockets.
- **DTO** — the wire-format types in `src/Dtos/` (`GameDto`, `PlayerRoundsDto`, `RoundDto`, etc.) produced by `MapToDto()`. Domain objects are mapped to DTOs before being sent to clients.
- **Warmup** — an initial request the client fires on load to wake the Azure App Service backend from cold start before real traffic.

## Frontend-specific

- **me** — the `Player` representing the current user in `App.tsx` (as opposed to the other players in the game).
- **Tutorial context** — a `TutorialContext` value (home, createGame, inGame, bidding, playing, etc.) that selects which context-sensitive help to show based on the current game state.
