---
name: verify
description: Build, launch, and drive the Skull King app locally to verify frontend/backend changes end-to-end in a real browser.
---

# Verify Skull King changes locally

## Launch

- Backend (https://localhost:59936, per `src/skull-king-service/Properties/launchSettings.json`; self-signed dev cert):
  `cd skull-king-service && dotnet run --project src\skull-king-service\skull-king-service.csproj --launch-profile skull-king-service`
- Frontend must run on **port 53647** or the backend CORS rejects it (defaults `SK_CLIENT_ADDRESS=localhost`, `PORT=53647` in Program.cs):
  `cd skull-king-app; $env:PORT = '53647'; yarn dev`
- `.env.local` already points the frontend at `https://localhost:59936`.
- Probe: `GET https://localhost:59936/` returns "Skull King Api" (use `-SkipCertificateCheck`); `GET http://localhost:53647/` returns 200.

## Drive (Playwright)

No playwright dep in the repo — in a scratch dir, `npm i playwright-core` and launch with `channel: "chrome"` (installed on this machine) plus `args: ["--ignore-certificate-errors"]` and `ignoreHTTPSErrors: true` (the backend's dev cert is self-signed; node `fetch` also rejects it, so probe the backend from PowerShell, not node).

Gotchas that cost time:

- Set cookie `skullKingTutorialPromptSeen=true` on the context first, or the tutorial prompt modal blocks everything.
- Home page buttons are invisible divs: `.gameButton` (first = Create Game, second = Join Game) over the banner image.
- Create: fill placeholder "Enter your name", click button "Start" → URL becomes `/GAMEID/PLAYERID`.
- Join: goto `/GAMEID`, fill "Enter your name", click "Join".
- In-game marker: `img.exitGameButton` is present when a game is loaded.
- Game polling is 1/sec to `GET /games/{id}/?knownHash=`; watch `page.on("response")` for `/games/` to observe it.
- Kill backend: `Get-NetTCPConnection -LocalPort 59936 -State Listen | Select -Expand OwningProcess -Unique | % { Stop-Process -Id $_ -Force }`. Restarting it starts with an EMPTY in-memory DB — all games gone (useful for testing the game-lost path; makes real recovery untestable).
- Backend cold `dotnet run` takes up to ~60s to serve first request.
