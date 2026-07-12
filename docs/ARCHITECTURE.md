# Architecture

For definitions of domain terms (game, round, bid, trick, captain, hash, etc.) see [terms.md](terms.md).

A scoring app for the [Skull King](https://www.grandpabecksgames.com/pages/skull-king) card game. Two independently-deployed halves in one repo:

- `skull-king-app/` — React + TypeScript + Vite single-page app (Azure Static Web Apps)
- `skull-king-service/` — .NET 10 minimal-API backend (Azure App Service)

## Commands

### Frontend (`skull-king-app/`, use yarn, never npm)

| Task | Command |
| --- | --- |
| Install | `yarn install` |
| Dev server | `yarn dev` |
| Build (typecheck + bundle) | `yarn build` (runs `tsc -b && vite build`) |
| Lint | `yarn lint` (eslint, `--max-warnings 0`) |
| Format | `yarn format` / check with `yarn format:check` |

### Backend (`skull-king-service/`)

| Task | Command |
| --- | --- |
| Build | `dotnet build .\skull-king-service\src\skull-king-service\skull-king-service.csproj` |
| Unit tests | `dotnet test .\skull-king-service\tests\skull-king-service.tests\skull-king-service.tests.csproj` |
| Integration tests | `dotnet test .\skull-king-service\tests\skull-king-service.integration-tests\skull-king-service.integration-tests.csproj` |
| Run a single test | `dotnet test <project> --filter "FullyQualifiedName~TestMethodName"` |

`skull-king.sln` ties the projects together. Tests use xUnit; integration tests spin up the API in-process via `WebApplicationFactory<Program>` (see `TestFixture.cs`) with a separate in-memory database.

## Configuration

- Frontend reads `VITE_REACT_APP_BASE_SERVICE_URI` to find the backend. `.env` points at production (`https://skull-king-api.azurewebsites.net`); `.env.local` overrides it for local dev (points at a local backend). Service URLs are built in `src/service-paths.ts` by substituting `BASE_URI` and other placeholders into template strings.
- Backend CORS (`Program.cs`) allows the origin built from `SK_CLIENT_ADDRESS` (default `http://localhost`) and `PORT` (default `53647`) env vars, plus localhost/127.0.0.1 on that port.

## Backend architecture

Minimal API; all routes registered in `src/Routes/GameRoutes.cs` via `GameRoutes.Register(app, cors)`. Persistence is **EF Core InMemory** (`SkullKingDbContext`) — there is no real database; all game state is lost on restart. This is intentional for a transient, single-server game tracker.

Because state is in-memory, the App Service must stay warm or in-progress games are lost. An external **UptimeRobot** monitor pings the warmup route (`/`, supports GET and HEAD) every ~5 minutes to prevent idle recycles. Platform restarts/deploys still wipe all games; the client tolerates brief outages (see frontend notes below) but cannot recover a wiped game.

### Domain model (`src/Game/`)

- `Game` — aggregate root (a C# `record`). Holds `Status` (`AcceptingPlayers → BiddingOpen → BiddingClosed → … → GameOver`), the player list, and game options (`IsRandomBid`, `Difficulty`, `ExpansionEnabled`). State transitions go through `StartGame`, `MoveToNextPhase`, `MoveToPreviousPhase`. A game is exactly 10 rounds; 2–8 players (9 with the expansion).
- `PlayerRounds` — one per player, owns that player's `Round` list and bid/score logic.
- The **first player in the list is the "captain"** (game owner) — only they may start the game, remove other players, and reorder. The captain cannot leave while others remain.
- `GameId` — short human-friendly code; normalizes look-alike characters (O→0, I→1).

### Optimistic concurrency via hashing

Every mutation re-computes a hash of the game (`Game.GetHashCode()` = hash of its JSON serialization) and stores it in the `Hashes` table (`UpdateHashAndSaveAsync`). Clients pass the hash they last saw as `knownHash`:

- `GET /games/{id}?knownHash=...` returns **304 Not Modified** when unchanged (used by the client's 1-second poll to avoid re-rendering).
- Mutating routes reject stale writes with **409 Conflict** or **412 Precondition Failed**; the client re-fetches the latest hash and retries.

DTOs in `src/Dtos/` are the wire format (`MapToDto()`); domain objects are not serialized directly to clients except where noted.

## Frontend architecture

- `App.tsx` is the single stateful container — it owns the `game` and `me` (current player) state and all the API-calling callbacks (create/join/start/bid/score/reorder/exit). Child components (`GameSetup`, `GameInfo`, `PlayArea`, `PlayerStatusCard`) are largely presentational and receive callbacks as props.
- **Polling, not websockets:** once in a game, `startUpdateTimer` polls `GET /games/{id}` every 1 second, sending `knownHash` so most polls return 304. The current hash is tracked in `currentHashRef`. Polling is resilient to transient backend outages: network errors are ignored, and the game is only declared lost after several consecutive 404s; the deep-link rejoin also retries before giving up.
- While a game is underway the app holds a screen wake lock (`src/utils/use-wake-lock.ts`) so phones keep polling, and a `visibilitychange` handler refreshes immediately when the app returns to the foreground.
- All HTTP goes through the thin `axios` wrappers in `src/utils/api-utils.ts` (`callGetRoute`/`callPostRoute`/`callPutRoute`/`callDeleteRoute`), which normalize success/error into `{ data, status, statusText }`.
- Routing: URL is `/{gameId}/{playerId}`; on load `App` validates the player is in the game and joins the poll, else redirects home.
- Game identity (which player "me" is) lives in state/URL; `cookie-utils.ts` is only used to remember whether the tutorial prompt has been shown.
- Tutorial system (`Tutorial.tsx`, `TutorialContext.tsx`) drives context-sensitive help based on `game.status`.

## Deployment

Both halves deploy from `main` via GitHub Actions, each gated on its own path filter:

- `.github/workflows/publish-frontend.yml` — `yarn install && yarn build`, then Azure Static Web Apps deploy. Also handles PR preview/close.
- `.github/workflows/publish-backend.yml` — `dotnet build` + run both test projects + `dotnet publish`, then Azure App Service deploy (`skull-king-api`). Azure credentials are GitHub secrets.

Because the workflows are path-filtered, a change touching only one half only runs/deploys that half.
