# Contributing

This document covers local development, project structure, and the product perspective contributors should keep in mind when changing Mimu Chess.

## Development Setup

Requirements:

- [Bun](https://bun.sh/)
- a local UCI engine executable for testing gameplay and analysis
- `bun install` to fetch the project-local Neutralino CLI used by desktop-mode workflows

Install dependencies from the repo root:

```bash
bun install
```

## Common Scripts

Root scripts:

| Command | Purpose |
| --- | --- |
| `bun run dev` | Start client and server together |
| `bun run dev:client` | Start the Bun frontend dev server |
| `bun run dev:server` | Start the Bun backend |
| `bun run build` | Build client and server |
| `bun run desktop:dev` | Run the Neutralino desktop app in development |
| `bun run desktop:build` | Build the Neutralino desktop app |

Workspace scripts:

```bash
# client
bun run --cwd client dev
bun run --cwd client build

# server
bun run --cwd server dev
bun run --cwd server build
bun run --cwd server start
```

## Project Structure

```text
client/
  src/
    components/            Main UI surfaces
    context/               Theme and shared UI state
    hooks/                 Socket and shared hooks
    lib/                   Client-side helpers

server/
  src/
    analysis/              Engine-backed analysis session logic
    config/                App-data and settings storage
    engine/                UCI engine lifecycle and validation
    game/                  Human-vs-AI and match execution
    history/               PGN-backed history storage
    utils/                 Shared helpers such as PGN generation
```

## How To Run The App

Browser-style development:

```bash
bun run dev
```

Desktop development:

```bash
bun run desktop:dev
```

Production build:

```bash
bun run build
```

Desktop build:

```bash
bun run desktop:build
```

## Storage And Local Data

Mimu Chess is intentionally local-first.

Saved files live in the app config directory:

- Windows: `%APPDATA%\Mimu Chess`
- macOS: `~/Library/Application Support/Mimu Chess`
- Linux: `$XDG_CONFIG_HOME/mimu-chess` or `~/.config/mimu-chess`

Key persisted data:

- `engines.json`
- `settings.json`
- `game-history/*.pgn`

When you add features, prefer file-backed persistence for game artifacts over browser-only storage.

## Product Perspective

Changes should preserve these assumptions:

- The app is for local engines, not online engine hosting.
- Saved games and analysis history should remain inspectable and exportable.
- The desktop experience matters as much as browser dev mode.
- Engine-heavy workflows should feel practical, not toy-like.
- UI polish should support clarity first: board state, engine output, and saved games should be easy to scan.

## Contribution Expectations

- Keep features consistent with the local-first model.
- Avoid introducing cloud dependencies for core gameplay or storage.
- Prefer reusing the existing engine/history/socket patterns instead of creating parallel systems.
- Validate changes in both `client` and `server` when you touch shared flows.
- If you add user-facing functionality, update the root `README.md`.

## Testing And Validation

At minimum, run the relevant build/typecheck after changes:

```bash
bun run --cwd client build
bun run --cwd server build
```

If you changed end-to-end flows such as gameplay, history, analysis, or engine management, also test them manually with a real engine.

## Notes

- The backend includes Windows-specific file picker support for engine and weights selection in desktop usage.
- Desktop scripts use the project-local `@neutralinojs/neu` CLI installed via `bun install`.
- Browser dev mode is useful for UI iteration, but engine workflows should also be verified in desktop mode when relevant.
