# Mimu Chess

Desktop chess for people who run real UCI engines.

Play against an engine, run engine-vs-engine matches, review saved PGNs, and analyze positions in one client.

<p align="center">
  <a href="./LICENSE"><img alt="License GPL-3.0" src="https://img.shields.io/badge/license-GPL--3.0-1f6feb"></a>
  <img alt="Bun" src="https://img.shields.io/badge/runtime-Bun-F7F7F7?logo=bun&logoColor=111111">
  <img alt="React 19" src="https://img.shields.io/badge/ui-React%2019-149ECA?logo=react&logoColor=white">
  <img alt="Desktop" src="https://img.shields.io/badge/desktop-Neutralino-2C3E50">
</p>

<p align="center">
  <img src="./docs/readme/play-vs-ai.png" alt="Mimu Chess Play vs AI screen with the board, sidebar navigation, and game setup panel." width="100%" />
</p>

## What It Does

- Play as White or Black against a UCI engine
- Run multi-game engine-vs-engine matches with live eval, depth, PV, nodes, and NPS
- Save finished games as PGN in the game history folder
- Reopen saved games and analyze any position with a selected engine
- Work in desktop mode for the full file and engine flow, or browser dev mode for UI iteration

## How The Client Works

```mermaid
flowchart LR
    subgraph Machine["Mimu Chess runtime"]
        UI["React client / Neutralino desktop shell"]
        API["Bun + Express server"]
        Engines["EngineManager<br/>UCI executables"]
        Play["GameManager<br/>play vs AI"]
        Match["MatchRunner<br/>engine matches"]
        Analysis["AnalysisManager<br/>position analysis"]
        Settings["SettingsStore<br/>settings.json"]
        History["HistoryStore<br/>game-history/*.pgn"]
    end

    UI -->|"Socket.IO + HTTP"| API
    API --> Engines
    API --> Play
    API --> Match
    API --> Analysis
    API --> Settings
    API --> History
```

## Quick Start

```bash
bun install
bun run desktop:dev
```

Browser-only development:

```bash
bun run dev
```

Build the app:

```bash
bun run build
bun run desktop:build
```

## Typical Workflow

1. Install dependencies with `bun install`.
2. Start the app with `bun run desktop:dev`.
3. Add a UCI engine in `Engines`.
4. Use `Play vs AI`, `Match`, or `History / Analysis`.
5. Reopen saved PGNs from history when you want to review or analyze a game.

## Engine Support

Mimu Chess is built for UCI executables, including setups that need an extra weights file such as LC0 or Maia-style engines.

## Data Files

Saved files live in the app config directory:

- Windows: `%APPDATA%\Mimu Chess`
- macOS: `~/Library/Application Support/Mimu Chess`
- Linux: `$XDG_CONFIG_HOME/mimu-chess` or `~/.config/mimu-chess`

Key files:

```text
engines.json
settings.json
game-history/
```

## Project Layout

```text
client/                    React frontend
server/                    Local backend and engine integration
scripts/                   Desktop packaging helpers
dist/                      Built frontend and desktop assets
neutralino.config.json     Neutralino desktop config
CONTRIBUTING.md            Development guide
```

## Stack

- `client`: React 19, TypeScript, Material UI, `react-chessboard`
- `server`: Bun, Express, Socket.IO, `chess.js`
- `desktop`: Neutralino

## Contributing

Development details live in [CONTRIBUTING.md](./CONTRIBUTING.md).

When reporting issues, include your OS, the engine you tried to run, and whether the problem happens in `bun run dev`, `bun run desktop:dev`, or both.

## License

[GPL-3.0](./LICENSE)
