# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Stack: typescript, react, yarn (never npm), vite, c#, .NET 8 minimal API, EF Core (in-memory), xUnit

Process for changes: Edit, build, test, fix tests, repeat, commit, push, watch the GitHub Actions build and fix if needed.

Always commit and push every change without being asked — this includes small edits and edits to docs/CLAUDE.md itself. Push to origin/main by default; only use a branch if asked, in which case push to that branch and create a pull request.

Exception — if a change does not feel ready, push it to a branch and open a PR instead of pushing to main, then let me know. A change may not be ready when: (1) we are iterating on the work; (2) adding instructions is ongoing and not complete — in this case ask whether it's complete, whether I'd like a branch, or to just keep working locally; (3) the change is only for plan mode or it otherwise seems like more instructions are coming (e.g. I say "I want to try something out" or "let's play around with an idea").

The repo has two independently-deployed halves: the frontend (`skull-king-app/`) deploys to Azure Static Web Apps and the backend (`skull-king-service/`) deploys to Azure App Service. Each has its own GitHub Actions workflow that only triggers on changes under its path — after pushing, watch the workflow(s) for the half you touched.

For architecture, commands, deployment, and configuration, read [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) when a request needs that detail. For definitions of domain terms, see [docs/terms.md](docs/terms.md).
