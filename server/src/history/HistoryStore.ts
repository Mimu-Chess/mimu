import fs from 'fs';
import path from 'path';
import { Chess } from 'chess.js';
import { getConfigDirectory } from '../config/appPaths.js';

export type GameHistoryMode = 'play' | 'match';

export interface GameHistoryEntry {
    id: string;
    title: string;
    subtitle: string;
    result: string;
    moves: string[];
    pgn: string;
    white: string;
    black: string;
    createdAt: string;
    mode: GameHistoryMode;
    fileName: string;
}

interface SaveGameHistoryInput {
    title: string;
    subtitle: string;
    result: string;
    moves: string[];
    pgn: string;
    white: string;
    black: string;
    mode: GameHistoryMode;
    createdAt?: Date;
}

const HISTORY_DIR = path.join(getConfigDirectory(), 'game-history');

function safeSegment(value: string): string {
    return value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 48) || 'game';
}

function parsePgnHeaders(pgn: string): Record<string, string> {
    const headers: Record<string, string> = {};

    for (const line of pgn.split(/\r?\n/)) {
        const match = line.match(/^\[([A-Za-z0-9_]+)\s+"(.*)"\]$/);
        if (!match) {
            if (line.trim() === '') {
                break;
            }
            continue;
        }

        headers[match[1]] = match[2].replace(/\\"/g, '"');
    }

    return headers;
}

function formatTimestamp(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return value;
    }
    return date.toLocaleString();
}

function normalizeSubtitle(subtitle: string, createdAt: string): string {
    const timestamp = formatTimestamp(createdAt);
    if (subtitle.startsWith(`${timestamp} - `)) {
        return subtitle.slice(`${timestamp} - `.length).trim();
    }
    if (subtitle.startsWith(`${timestamp} · `)) {
        return subtitle.slice(`${timestamp} · `.length).trim();
    }
    return subtitle.trim();
}

function parseEntry(fileName: string): GameHistoryEntry | null {
    const fullPath = path.join(HISTORY_DIR, fileName);

    try {
        const pgn = fs.readFileSync(fullPath, 'utf-8');
        const stats = fs.statSync(fullPath);
        const headers = parsePgnHeaders(pgn);
        const chess = new Chess();
        const id = path.basename(fileName, path.extname(fileName));
        chess.loadPgn(pgn);

        const white = headers.White || 'White';
        const black = headers.Black || 'Black';
        const mode = headers.MimuMode === 'match' ? 'match' : 'play';
        const createdAt = headers.MimuCreatedAt || stats.mtime.toISOString();

        return {
            id,
            title: headers.MimuTitle || `${white} vs ${black}`,
            subtitle: normalizeSubtitle(headers.MimuSubtitle || stats.mtime.toLocaleString(), createdAt),
            result: headers.Result || '*',
            moves: chess.history(),
            pgn,
            white,
            black,
            createdAt,
            mode,
            fileName,
        };
    }
    catch {
        return null;
    }
}

export class HistoryStore {
    private ensureStorageDirectory(): void {
        fs.mkdirSync(HISTORY_DIR, { recursive: true });
    }

    saveGame(input: SaveGameHistoryInput): GameHistoryEntry {
        this.ensureStorageDirectory();

        const createdAt = input.createdAt || new Date();
        const timestamp = createdAt.toISOString().replace(/[:.]/g, '-');
        const baseName = `${input.mode}-${timestamp}-${safeSegment(input.white)}-vs-${safeSegment(input.black)}`;
        let fileName = `${baseName}.pgn`;
        let suffix = 1;

        while (fs.existsSync(path.join(HISTORY_DIR, fileName))) {
            fileName = `${baseName}-${suffix}.pgn`;
            suffix += 1;
        }

        fs.writeFileSync(path.join(HISTORY_DIR, fileName), input.pgn, 'utf-8');

        const entry = parseEntry(fileName);
        if (!entry) {
            throw new Error(`Failed to read saved history file: ${fileName}`);
        }

        return entry;
    }

    list(mode?: GameHistoryMode): GameHistoryEntry[] {
        this.ensureStorageDirectory();

        return fs.readdirSync(HISTORY_DIR)
            .filter((fileName) => fileName.toLowerCase().endsWith('.pgn'))
            .map((fileName) => parseEntry(fileName))
            .filter((entry): entry is GameHistoryEntry => !!entry)
            .filter((entry) => !mode || entry.mode === mode)
            .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
    }

    clear(mode?: GameHistoryMode): void {
        this.ensureStorageDirectory();

        for (const entry of this.list(mode)) {
            try {
                fs.unlinkSync(path.join(HISTORY_DIR, entry.fileName));
            }
            catch {
                // Ignore files that disappear mid-clear.
            }
        }
    }
}
