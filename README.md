# Mimu Chess

Mimu Chess is a local UCI chess client with a React frontend, a Bun/Express Socket.IO server, and an optional Neutralino desktop shell.

It is built for running chess engines on your own machine. You can play against an engine, run engine-vs-engine matches, inspect live engine output, and export PGN results.

## Features

- Play human vs AI with a local UCI engine
- Run automated engine matches
- Add and remove engines from the UI
- Support engines that need a separate weights file, such as LC0 or Maia
- Show live engine search info while the engine is thinking
- Export game and match PGN
- Run in the browser during development or as a Neutralino desktop app

## Stack

- `client`: React 19, Vite, TypeScript, Material UI, Socket.IO client
- `server`: Bun, Express, Socket.IO, `chess.js`
- `desktop`: Neutralino

## Project Layout

```text
.
|- client/                  React app
|- server/                  Bun + Express + Socket.IO backend
|- dist/                    Built frontend / Neutralino assets
|- neutralino.config.json   Desktop app config
`- package.json             Root workspace scripts
```

## Requirements

- [Bun](https://bun.sh/)
- A local UCI chess engine executable
- Neutralino CLI if you want to use the desktop scripts

## Quick Start

Install dependencies from the repo root:

```bash
bun install
```

Start the client and server together:

```bash
bun run dev
```

Useful split commands:

```bash
bun run dev:client
bun run dev:server
```

Build both workspaces:

```bash
bun run build
```

## Desktop Mode

Run the Neutralino desktop app in development:

```bash
bun run desktop:dev
```

Build the desktop app:

```bash
bun run desktop:build
```

Notes:

- `desktop:*` scripts expect the `neu` CLI to be available
- The frontend is built into `dist/` and Neutralino loads from there

## Engine Setup

1. Start the app.
2. Open the `Engines` page.
3. Add an engine name and the full path to the UCI executable.
4. If the engine needs weights, enable the weights option and provide the weights file path.
5. For engines like Maia, you can also set a fixed node limit per move.

Engine definitions are persisted in [`server/engines.json`](/c:/Users/wadah/Documents/Mimu Chess/server/engines.json) after they are validated by the backend.

## Configuration

Server:

- `PORT`: backend port, defaults to `3001`

Client:

- `VITE_SERVER_URL`: overrides the default backend URL
- default backend URL is `http://127.0.0.1:3001`

## Scripts

Root scripts:

| Command | Purpose |
| --- | --- |
| `bun run dev` | Start client and server together |
| `bun run dev:client` | Start the Vite frontend |
| `bun run dev:server` | Start the Bun backend |
| `bun run build` | Build client and server |
| `bun run desktop:dev` | Run the Neutralino desktop app in dev |
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

## Notes

- The backend includes Windows-specific file picker support for selecting engine binaries and weights files in desktop usage.
- Browser development mode still works without Neutralino.
- This project is intended for local engines, not remote engine hosting.

## License

See [LICENSE](LICENSE).
