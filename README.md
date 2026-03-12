# Mimu Chess

Mimu Chess is a local-first chess desktop app for playing against UCI engines, running engine matches, reviewing saved games, and analyzing positions from your own history.

It is built for people who want their engines, PGNs, and configuration to stay on their machine.

## Screenshots

Screenshot placeholders:

- `docs/screenshots/play-vs-ai.png`
- `docs/screenshots/engine-matches.png`
- `docs/screenshots/game-analysis.png`
- `docs/screenshots/engine-manager.png`
- `docs/screenshots/game-history.png`

## What It Does

- Play against a local UCI engine with configurable side and think time.
- Run engine-vs-engine matches and track score across multiple games.
- Save completed games as PGN files in the app config directory.
- Replay saved games directly inside the app move by move.
- Analyze saved games with any configured engine from the dedicated Analysis view.
- Inspect live engine output including depth, eval, PV, nodes, and NPS.
- Manage engine executables and weights-based engines such as LC0 or Maia.
- Use built-in game history filtering, including preset time ranges and custom date/time ranges.
- Switch between multiple board/app themes.
- Run as a local desktop app through Neutralino, with browser-based development available as well.

## Feature Overview

### Play vs AI

- Start a human-vs-engine game with your chosen engine.
- Play as White or Black.
- Flip the board, undo moves, resign, and export PGN.
- View completed games later from saved history.

### Engine Matches

- Run automated AI-vs-AI matches between configured engines.
- Alternate colors across games.
- Watch the current board and live engine info while the match runs.
- Save each completed match game into history for later replay or analysis.

### Game Analysis

- Open a saved game from history.
- Step to any ply in the game.
- Select an engine and analyze the currently displayed position.
- See the engine evaluation, depth, principal variation, and best move.

### Game History

- History is stored on disk as PGN files, not in browser storage.
- Replay games directly on the board.
- Filter by time window or custom date/time range.
- Download PGN from any saved entry.

### Engine Manager

- Add, update, and remove local UCI engines.
- Validate engine paths before saving.
- Support engines that require a weights file.
- Support fixed-node configurations for weights-based engines.

## Storage

Mimu Chess stores configuration and saved game history in the local app config directory.

Typical locations:

- Windows: `%APPDATA%\Mimu Chess`
- macOS: `~/Library/Application Support/Mimu Chess`
- Linux: `$XDG_CONFIG_HOME/mimu-chess` or `~/.config/mimu-chess`

Important files and folders:

- `engines.json`: saved engine definitions
- `settings.json`: desktop settings such as theme/onboarding state
- `game-history/`: saved PGN history

## Stack

- `client`: React 19, Bun bundler/dev server, TypeScript, Material UI
- `server`: Bun, Express, Socket.IO, `chess.js`
- `desktop`: Neutralino

## Project Layout

```text
.
|- client/                  React frontend
|- server/                  Local backend and engine integration
|- scripts/                 Desktop packaging helpers
|- neutralino/              Neutralino assets/runtime files
|- dist/                    Built frontend / desktop assets
|- neutralino.config.json   Desktop app config
|- CONTRIBUTING.md          Dev setup and contribution guide
`- package.json             Workspace scripts
```

## Requirements

- [Bun](https://bun.sh/)
- At least one local UCI engine executable to use the chess features
- `bun install` to fetch the project-local Neutralino CLI used by desktop-mode scripts

## Getting Started

Install dependencies from the repo root:

```bash
bun install
```

Start the app in development:

```bash
bun run dev
```

Build both client and server:

```bash
bun run build
```

For desktop-specific development and packaging details, see [CONTRIBUTING.md](CONTRIBUTING.md).

## Why This App Exists

Mimu Chess is built around a few practical ideas:

- Local-first: engines and saved games stay on your machine.
- Engine-focused: the UI is centered on real UCI workflows, not online play.
- Reviewable: games should be easy to replay, export, and analyze later.
- Desktop-friendly: engine path management and file-backed history should work cleanly outside the browser.
- Cross-platform: desktop engine and file workflows should work on Windows, macOS, and Linux.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for:

- development setup
- available scripts
- project structure
- contribution workflow
- project direction and constraints

## License

See [LICENSE](LICENSE).
