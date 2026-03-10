# Mimu Chess

Desktop-first UCI chess client built with React, Node.js, Socket.IO, and Tauri.

Mimu Chess lets you:

- play against a local UCI engine
- run engine-vs-engine matches
- manage multiple engines, including weight-based engines such as LC0 or Maia
- inspect live engine output and move lists
- export PGN from completed games and matches

## Stack

- `client`: React 19 + Vite + TypeScript + Material UI
- `server`: Node.js + Express + Socket.IO + `chess.js`
- `desktop`: Tauri 2 shell around the client and local backend

## Project Structure

```text
.
├─ client/              React UI
│  ├─ src/
│  └─ src-tauri/        Tauri desktop shell
├─ server/              local backend for engine/process management
│  ├─ src/
│  └─ engines.json      persisted engine config
└─ backup/              local backup copies, ignored by git
```

## Features

- Human vs AI play
- AI vs AI match runner
- Live engine info panel
- PGN export
- Theme switching
- Custom in-app file browser for engine executables and weights
- Support for engines that require a separate weights file
- Tauri desktop workflow for Windows

## Requirements

### Web app development

- Node.js
- npm

### Desktop development with Tauri

- Node.js
- npm
- Rust toolchain
- Windows Tauri build prerequisites

This repo is currently Windows-focused. Engine browsing and the current desktop workflow are built around Windows.

## Install

From the repo root:

```bash
npm run install:all
```

This installs dependencies for:

- the root workspace
- `client`
- `server`

## Running The App

### Web development

Runs the React client and Node server together:

```bash
npm run dev
```

Services:

- client: `http://localhost:5173`
- server: `http://localhost:3001`

You can also run them separately:

```bash
npm run dev:client
npm run dev:server
```

### Desktop development

Runs the Tauri window and starts the Vite + server stack through the Tauri dev command:

```bash
npm run desktop:dev
```

### Production builds

Build client and server:

```bash
npm run build
```

Build the desktop app:

```bash
npm run desktop:build
```

## Engine Setup

Go to the `Engines` page and add a UCI engine.

Supported flows:

- standard UCI engines such as Stockfish
- engines with a separate weights file
- engines using a fixed node limit per move

Engine configuration is persisted in:

- [`server/engines.json`](server/engines.json)

For weight-based engines, Mimu Chess sends:

```text
setoption name WeightsFile value <path>
```

before marking the engine ready.

## How It Works

### Client

The React app provides three main views:

- `Play vs AI`
- `Engine Matches`
- `Engines`

The chessboard UI is in:

- [`client/src/components/Chessboard/ChessboardPanel.tsx`](client/src/components/Chessboard/ChessboardPanel.tsx)

### Server

The Node backend:

- validates engine executables
- starts and stops engine processes
- coordinates human-vs-engine games
- coordinates engine-vs-engine matches
- emits live state over Socket.IO
- exposes file browsing endpoints used by the in-app explorer

Main entry point:

- [`server/src/index.ts`](server/src/index.ts)

### Desktop

Tauri wraps the app in a desktop window.

Tauri sources live in:

- [`client/src-tauri`](client/src-tauri)

Current desktop architecture:

- Tauri hosts the window
- Vite serves the UI in dev
- the Node backend still runs as a local sidecar/backend process

This means the app is packaged as a desktop app, but backend logic has not been rewritten into Rust commands.

## Useful Scripts

From the repo root:

```bash
npm run dev
npm run dev:client
npm run dev:server
npm run build
npm run desktop:dev
npm run desktop:build
```

From `client`:

```bash
npm run dev
npm run build
npm run tauri:dev
npm run tauri:build
```

From `server`:

```bash
npm run dev
npm run build
npm run start
```

## Git Notes

The repo ignores generated and machine-local output such as:

- `node_modules`
- `client/dist`
- `server/dist`
- `client/src-tauri/target`
- `client/src-tauri/bin`
- `client/src-tauri/gen`
- `backup`

Commit the Tauri source and config under `client/src-tauri`, but not the build output folders.

## Known Constraints

- Windows is the primary target right now
- desktop builds depend on the local Rust/Tauri toolchain
- the desktop app still relies on the Node backend
- engine behavior depends on each engine correctly speaking UCI

## License

See [`LICENSE`](LICENSE).
