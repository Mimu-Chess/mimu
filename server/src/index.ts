import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawn } from 'node:child_process';
import { EngineManager } from './engine/EngineManager.js';
import { SettingsStore } from './config/SettingsStore.js';
import { GameManager } from './game/GameManager.js';
import { MatchRunner } from './game/MatchRunner.js';
import { generatePGN } from './utils/pgn.js';
import { HistoryStore } from './history/HistoryStore.js';
import { AnalysisManager } from './analysis/AnalysisManager.js';
const app = express();
app.use(cors());
app.use(express.json());

function toPowerShellString(value: string): string {
    return `'${value.replace(/'/g, "''")}'`;
}

function buildWindowsDialogFilter(accept: string[]): string {
    const cleaned = accept
        .map((ext) => ext.trim())
        .filter((ext) => /^\.[a-z0-9.]+$/i.test(ext));
    if (cleaned.length === 0) {
        return 'All Files (*.*)|*.*';
    }
    const patterns = cleaned.map((ext) => `*${ext}`).join(';');
    return `Allowed Files (${patterns})|${patterns}|All Files (*.*)|*.*`;
}
function openWindowsFileDialog(opts: {
    title?: string;
    accept?: string[];
}): Promise<string | null> {
    const title = opts.title?.trim() || 'Select File';
    const filter = buildWindowsDialogFilter(opts.accept || []);
    const script = [
        'if (-not [Environment]::UserInteractive) { throw "Interactive desktop session is required." }',
        'Add-Type -AssemblyName System.Windows.Forms',
        '$dialog = New-Object System.Windows.Forms.OpenFileDialog',
        `$dialog.Title = ${toPowerShellString(title)}`,
        `$dialog.Filter = ${toPowerShellString(filter)}`,
        '$dialog.CheckFileExists = $true',
        '$dialog.Multiselect = $false',
        '[Console]::OutputEncoding = [System.Text.Encoding]::UTF8',
        'if ($dialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {',
        '  Write-Output $dialog.FileName',
        '}',
    ].join('; ');
    return new Promise((resolve, reject) => {
        const ps = spawn('powershell.exe', ['-NoProfile', '-STA', '-Command', script], {
            windowsHide: true,
        });
        let stdout = '';
        let stderr = '';
        ps.stdout.on('data', (chunk) => {
            stdout += chunk.toString();
        });
        ps.stderr.on('data', (chunk) => {
            stderr += chunk.toString();
        });
        ps.on('error', (err) => reject(err));
        ps.on('close', (code) => {
            if (code !== 0) {
                reject(new Error(stderr.trim() || `PowerShell exited with code ${code}`));
                return;
            }
            const selectedPath = stdout.trim();
            resolve(selectedPath || null);
        });
    });
}

function listDirectoryChildren(basePath: string): Array<{ name: string; fullPath: string; isDir: boolean }> {
    try {
        return fs.readdirSync(basePath)
            .map((name) => {
                try {
                    const fullPath = path.join(basePath, name);
                    return {
                        name,
                        fullPath,
                        isDir: fs.statSync(fullPath).isDirectory(),
                    };
                }
                catch {
                    return null;
                }
            })
            .filter((entry): entry is { name: string; fullPath: string; isDir: boolean } => entry !== null);
    }
    catch {
        return [];
    }
}

function getRootEntries() {
    if (process.platform === 'win32') {
        const drives = Array.from({ length: 26 }, (_, index) => `${String.fromCharCode(65 + index)}:\\`);
        return drives
            .filter((drive) => {
                try {
                    return fs.statSync(drive).isDirectory();
                }
                catch {
                    return false;
                }
            })
            .map((drive) => ({ name: drive.replace('\\', ''), fullPath: drive, isDir: true }));
    }

    const roots = new Map<string, { name: string; fullPath: string; isDir: boolean }>();
    const addRoot = (fullPath: string, name: string) => {
        try {
            if (fs.statSync(fullPath).isDirectory()) {
                roots.set(fullPath, { name, fullPath, isDir: true });
            }
        }
        catch {
            // Ignore missing or inaccessible locations.
        }
    };

    addRoot('/', '/');
    addRoot(os.homedir(), 'Home');

    if (process.platform === 'darwin') {
        addRoot('/Volumes', 'Volumes');
        for (const entry of listDirectoryChildren('/Volumes')) {
            if (entry.isDir) {
                roots.set(entry.fullPath, entry);
            }
        }
    }
    else {
        addRoot('/mnt', 'mnt');
        addRoot('/media', 'media');

        for (const mountRoot of ['/mnt', '/media']) {
            for (const entry of listDirectoryChildren(mountRoot)) {
                if (entry.isDir) {
                    roots.set(entry.fullPath, entry);
                }
            }
        }
    }

    return Array.from(roots.values()).sort((a, b) => a.name.localeCompare(b.name));
}

function getQuickAccessEntries() {
    const homeDir = os.homedir();
    const candidates = [
        { name: 'Home', fullPath: homeDir },
        { name: 'Desktop', fullPath: path.join(homeDir, 'Desktop') },
        { name: 'Documents', fullPath: path.join(homeDir, 'Documents') },
        { name: 'Downloads', fullPath: path.join(homeDir, 'Downloads') },
        { name: 'Pictures', fullPath: path.join(homeDir, 'Pictures') },
        { name: 'Videos', fullPath: path.join(homeDir, 'Videos') },
        { name: 'Music', fullPath: path.join(homeDir, 'Music') },
    ];
    return candidates.filter((entry) => {
        try {
            return fs.statSync(entry.fullPath).isDirectory();
        }
        catch {
            return false;
        }
    }).map((entry) => ({
        ...entry,
        isDir: true,
    }));
}
app.get('/api/files', (req, res) => {
    try {
        const rawPath = (req.query.path as string) || '';
        if (!rawPath) {
            return res.json({
                current: '',
                parent: null,
                entries: getRootEntries(),
            });
        }
        const resolved = path.resolve(rawPath);
        const stat = fs.statSync(resolved);
        if (!stat.isDirectory()) {
            return res.status(400).json({ error: 'Not a directory' });
        }
        const names = fs.readdirSync(resolved);
        const entries = names
            .map((name) => {
            try {
                const full = path.join(resolved, name);
                const s = fs.statSync(full);
                return { name, fullPath: full, isDir: s.isDirectory() };
            }
            catch {
                return null;
            }
        })
            .filter(Boolean)
            .sort((a: any, b: any) => {
            if (a.isDir !== b.isDir)
                return a.isDir ? -1 : 1;
            return a.name.localeCompare(b.name);
        });
        const parentPath = path.dirname(resolved);
        const parent = parentPath !== resolved ? parentPath : null;
        return res.json({ current: resolved, parent, entries });
    }
    catch (err) {
        return res.status(500).json({ error: (err as Error).message });
    }
});
app.get('/api/files/places', (_req, res) => {
    try {
        return res.json({
            entries: getQuickAccessEntries(),
        });
    }
    catch (err) {
        return res.status(500).json({ error: (err as Error).message });
    }
});
app.get('/api/files/pick', async (req, res) => {
    try {
        if (process.platform !== 'win32') {
            return res.status(400).json({ error: 'Windows Explorer picker is only available on Windows hosts.' });
        }
        const title = String(req.query.title || 'Select File');
        const accept = String(req.query.accept || '')
            .split(',')
            .map((ext) => ext.trim())
            .filter(Boolean);
        const selectedPath = await openWindowsFileDialog({ title, accept });
        return res.json({ path: selectedPath });
    }
    catch (err) {
        return res.status(500).json({ error: (err as Error).message });
    }
});
app.get('/api/files/read', (req, res) => {
    try {
        const rawPath = String(req.query.path || '');
        if (!rawPath) {
            return res.status(400).json({ error: 'Path is required' });
        }
        const resolved = path.resolve(rawPath);
        const stat = fs.statSync(resolved);
        if (!stat.isFile()) {
            return res.status(400).json({ error: 'Not a file' });
        }
        const content = fs.readFileSync(resolved, 'utf8');
        return res.json({ path: resolved, content });
    }
    catch (err) {
        return res.status(500).json({ error: (err as Error).message });
    }
});
const httpServer = createServer(app);
const isAllowedOrigin = (origin?: string) => {
    if (!origin)
        return true;
    return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
};
const io = new Server(httpServer, {
    cors: {
        origin: (origin, callback) => {
            if (isAllowedOrigin(origin)) {
                callback(null, true);
            }
            else {
                callback(new Error(`CORS blocked for origin: ${origin}`));
            }
        },
        methods: ['GET', 'POST'],
    },
});
const engineManager = new EngineManager();
const settingsStore = new SettingsStore();
const historyStore = new HistoryStore();
const games = new Map<string, GameManager>();
const matches = new Map<string, MatchRunner>();
const analyses = new Map<string, AnalysisManager>();
io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);
    socket.on('settings:get', (callback) => {
        try {
            callback({ success: true, settings: settingsStore.read() });
        }
        catch (err) {
            callback({ success: false, error: (err as Error).message });
        }
    });
    socket.on('settings:update', (patch, callback) => {
        try {
            callback({ success: true, settings: settingsStore.patch(patch || {}) });
        }
        catch (err) {
            callback({ success: false, error: (err as Error).message });
        }
    });
    socket.on('engine:list', (callback) => {
        callback(engineManager.getEngines());
    });
    socket.on('history:list', (data: {
        mode?: 'play' | 'match';
    } | undefined, callback) => {
        try {
            callback({ success: true, entries: historyStore.list(data?.mode) });
        }
        catch (err) {
            callback({ success: false, error: (err as Error).message, entries: [] });
        }
    });
    socket.on('history:clear', (data: {
        mode?: 'play' | 'match';
    } | undefined, callback) => {
        try {
            historyStore.clear(data?.mode);
            socket.emit('history:cleared', { mode: data?.mode || null });
            callback?.({ success: true });
        }
        catch (err) {
            callback?.({ success: false, error: (err as Error).message });
        }
    });
    socket.on('analysis:start', async (data: {
        engineName: string;
        positions: Array<{
            plyIndex: number;
            fen: string;
        }>;
        movetime?: number;
    }, callback) => {
        try {
            let analysis = analyses.get(socket.id);
            if (!analysis) {
                analysis = new AnalysisManager(engineManager);
                analysis.on('info', (info) => {
                    socket.emit('analysis:info', info);
                });
                analysis.on('progress', (result) => {
                    socket.emit('analysis:progress', result);
                });
                analysis.on('complete', (result) => {
                    socket.emit('analysis:complete', result);
                });
                analysis.on('error', (error) => {
                    socket.emit('analysis:error', { error: (error as Error).message });
                });
                analyses.set(socket.id, analysis);
            }

            callback?.({ success: true });
            void analysis.analyze(data);
        }
        catch (err) {
            callback?.({ success: false, error: (err as Error).message });
        }
    });
    socket.on('analysis:stop', (callback) => {
        const analysis = analyses.get(socket.id);
        if (analysis) {
            analysis.stop();
        }
        callback?.({ success: true });
    });
    socket.on('engine:add', async (data: {
        name: string;
        path: string;
        weightsConfig?: {
            weightsFile: string;
            nodes: number;
        };
    }, callback) => {
        try {
            const config = await engineManager.addEngine(data);
            callback({ success: true, engine: config });
            io.emit('engine:list-update', engineManager.getEngines());
        }
        catch (err) {
            callback({ success: false, error: (err as Error).message });
        }
    });
    socket.on('engine:update', async (data: {
        oldName: string;
        name: string;
        path: string;
        weightsConfig?: {
            weightsFile: string;
            nodes: number;
        };
    }, callback) => {
        try {
            const config = await engineManager.updateEngine(data.oldName, data);
            callback({ success: true, engine: config });
            io.emit('engine:list-update', engineManager.getEngines());
        }
        catch (err) {
            callback({ success: false, error: (err as Error).message });
        }
    });
    socket.on('engine:remove', (data: {
        name: string;
    }, callback) => {
        const removed = engineManager.removeEngine(data.name);
        callback({ success: removed });
        if (removed) {
            io.emit('engine:list-update', engineManager.getEngines());
        }
    });
    socket.on('game:start', async (data, callback) => {
        try {
            const gameManager = new GameManager(engineManager);
            games.set(socket.id, gameManager);
            gameManager.on('state', (state) => {
                socket.emit('game:state', state);
            });
            gameManager.on('engine-info', (info) => {
                socket.emit('game:engine-info', info);
            });
            gameManager.on('gameover', (state) => {
                socket.emit('game:over', state);
                const config = gameManager.getConfig();
                if (config) {
                    const createdAt = new Date();
                    const white = config.humanColor === 'white' ? 'Human' : (config.blackEngine || config.whiteEngine || 'Engine');
                    const black = config.humanColor === 'black' ? 'Human' : (config.blackEngine || config.whiteEngine || 'Engine');
                    const pgn = generatePGN({
                        white,
                        black,
                        result: state.result || '*',
                        moves: state.movesSan,
                        date: createdAt,
                        headers: {
                            MimuMode: 'play',
                            MimuCreatedAt: createdAt.toISOString(),
                            MimuTitle: `${white} vs ${black}`,
                            MimuSubtitle: `${config.blackEngine || config.whiteEngine || 'Engine'}`,
                        },
                    });
                    const entry = historyStore.saveGame({
                        title: `${white} vs ${black}`,
                        subtitle: `${config.blackEngine || config.whiteEngine || 'Engine'}`,
                        result: state.result || '*',
                        moves: state.movesSan,
                        pgn,
                        white,
                        black,
                        mode: 'play',
                        createdAt,
                    });
                    socket.emit('history:saved', entry);
                    socket.emit('game:pgn', pgn);
                }
            });
            const state = await gameManager.startGame(data);
            callback({ success: true, state });
        }
        catch (err) {
            callback({ success: false, error: (err as Error).message });
        }
    });
    socket.on('game:move', async (data: {
        from: string;
        to: string;
        promotion?: string;
    }, callback) => {
        const gameManager = games.get(socket.id);
        if (!gameManager) {
            callback({ success: false, error: 'No active game' });
            return;
        }
        const state = await gameManager.makeHumanMove(data.from, data.to, data.promotion);
        if (state) {
            callback({ success: true, state });
        }
        else {
            callback({ success: false, error: 'Invalid move' });
        }
    });
    socket.on('game:undo', (callback) => {
        const gameManager = games.get(socket.id);
        if (!gameManager) {
            callback({ success: false, error: 'No active game' });
            return;
        }
        const state = gameManager.undoMove();
        if (state) {
            callback({ success: true, state });
        }
        else {
            callback({ success: false, error: 'Cannot undo' });
        }
    });
    socket.on('game:resign', (data: {
        color: 'white' | 'black';
    }, callback) => {
        const gameManager = games.get(socket.id);
        if (!gameManager) {
            callback({ success: false, error: 'No active game' });
            return;
        }
        const state = gameManager.resign(data.color);
        callback({ success: true, state });
    });
    socket.on('game:stop', (callback) => {
        const gameManager = games.get(socket.id);
        if (gameManager) {
            gameManager.stopGame();
            games.delete(socket.id);
        }
        callback?.({ success: true });
    });
    socket.on('match:start', async (data, callback) => {
        try {
            const matchRunner = new MatchRunner(engineManager);
            matches.set(socket.id, matchRunner);
            matchRunner.on('game-start', (info) => {
                socket.emit('match:game-start', info);
            });
            matchRunner.on('game-state', (state) => {
                socket.emit('match:game-state', state);
            });
            matchRunner.on('engine-info', (info) => {
                socket.emit('match:engine-info', info);
            });
            matchRunner.on('match-update', (update) => {
                const createdAt = new Date();
                const subtitle = `${update.result.white} vs ${update.result.black}`;
                const pgn = generatePGN({
                    white: update.result.white,
                    black: update.result.black,
                    result: update.result.result,
                    moves: update.result.moves,
                    date: createdAt,
                    event: `Match Game ${update.result.gameNumber}`,
                    headers: {
                        MimuMode: 'match',
                        MimuCreatedAt: createdAt.toISOString(),
                        MimuTitle: `Game ${update.result.gameNumber}`,
                        MimuSubtitle: subtitle,
                    },
                });
                const entry = historyStore.saveGame({
                    title: `Game ${update.result.gameNumber}`,
                    subtitle,
                    result: update.result.result,
                    moves: update.result.moves,
                    pgn,
                    white: update.result.white,
                    black: update.result.black,
                    mode: 'match',
                    createdAt,
                });
                socket.emit('history:saved', entry);
                socket.emit('match:update', update);
            });
            matchRunner.on('match-end', (result) => {
                socket.emit('match:end', result);
                matches.delete(socket.id);
            });
            matchRunner.on('match-error', (err) => {
                socket.emit('match:error', err);
            });
            callback({ success: true });
            matchRunner.startMatch(data);
        }
        catch (err) {
            callback({ success: false, error: (err as Error).message });
        }
    });
    socket.on('match:stop', (callback) => {
        const matchRunner = matches.get(socket.id);
        if (matchRunner) {
            matchRunner.stopMatch();
            matches.delete(socket.id);
        }
        callback?.({ success: true });
    });
    socket.on('match:results', (callback) => {
        const matchRunner = matches.get(socket.id);
        if (matchRunner) {
            callback({
                results: matchRunner.getResults(),
                score: matchRunner.getScore(),
            });
        }
        else {
            callback({ results: [], score: null });
        }
    });
    socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
        const gameManager = games.get(socket.id);
        if (gameManager) {
            gameManager.stopGame();
            games.delete(socket.id);
        }
        const matchRunner = matches.get(socket.id);
        if (matchRunner) {
            matchRunner.stopMatch();
            matches.delete(socket.id);
        }
        const analysis = analyses.get(socket.id);
        if (analysis) {
            analysis.dispose();
            analyses.delete(socket.id);
        }
    });
});
const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
    console.log(`Mimu Chess server running on port ${PORT}`);
});
