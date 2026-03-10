# Mimu Chess

UCI chess client built with React, Bun, and Socket.IO.

## Stack

- `client`: React 19 + Vite + TypeScript + Material UI
- `server`: Bun + Express + Socket.IO + `chess.js`

## Project Structure

```text
.
├─ client/
│  └─ src/
├─ server/
│  ├─ src/
│  └─ engines.json
└─ backup/
```

## Requirements

- Bun

## Install

From the repo root:

```bash
bun install
```

## Running The App

Run client and server together:

```bash
bun run dev
```

Run them separately:

```bash
bun run dev:client
bun run dev:server
```

Build both apps:

```bash
bun run build
```

## Useful Scripts

From `client`:

```bash
bun run dev
bun run build
```

From `server`:

```bash
bun run dev
bun run build
bun run start
```

## License

See [`LICENSE`](LICENSE).
