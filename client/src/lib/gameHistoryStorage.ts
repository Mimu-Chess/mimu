import type { GameHistoryEntry } from '../components/GameHistory/GameHistoryPanel';

export const PLAY_HISTORY_STORAGE_KEY = 'mimu.playHistory.v1';
export const MATCH_HISTORY_STORAGE_KEY = 'mimu.matchHistory.v1';
const MAX_HISTORY_ENTRIES = 50;

function isHistoryEntry(value: unknown): value is GameHistoryEntry {
    if (!value || typeof value !== 'object') {
        return false;
    }

    const entry = value as Record<string, unknown>;
    return typeof entry.id === 'string'
        && typeof entry.title === 'string'
        && typeof entry.subtitle === 'string'
        && typeof entry.result === 'string'
        && Array.isArray(entry.moves)
        && entry.moves.every((move) => typeof move === 'string')
        && (entry.pgn === undefined || typeof entry.pgn === 'string')
        && typeof entry.white === 'string'
        && typeof entry.black === 'string';
}

export function readGameHistory(storageKey: string): GameHistoryEntry[] {
    if (typeof window === 'undefined') {
        return [];
    }

    try {
        const stored = window.localStorage.getItem(storageKey);
        if (!stored) {
            return [];
        }

        const parsed = JSON.parse(stored);
        if (!Array.isArray(parsed)) {
            return [];
        }

        return parsed.filter(isHistoryEntry).slice(0, MAX_HISTORY_ENTRIES);
    }
    catch {
        return [];
    }
}

export function writeGameHistory(storageKey: string, entries: GameHistoryEntry[]): void {
    if (typeof window === 'undefined') {
        return;
    }

    try {
        window.localStorage.setItem(storageKey, JSON.stringify(entries.slice(0, MAX_HISTORY_ENTRIES)));
    }
    catch {
        // Ignore storage write failures so gameplay is unaffected.
    }
}
