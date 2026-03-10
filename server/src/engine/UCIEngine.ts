import { EventEmitter } from 'events';
import { spawn, ChildProcess } from 'child_process';
export interface EngineInfo {
    depth?: number;
    score?: {
        type: 'cp' | 'mate';
        value: number;
    };
    pv?: string;
    nodes?: number;
    nps?: number;
    time?: number;
    multipv?: number;
}
export interface EngineConfig {
    name: string;
    path: string;
    type: 'uci';
    hasWeightsFile?: boolean;
    weightsFile?: string;
    nodes?: number;
}
export class UCIEngine extends EventEmitter {
    private process: ChildProcess | null = null;
    private config: EngineConfig;
    private buffer: string = '';
    private isReady: boolean = false;
    private engineName: string = '';
    private engineAuthor: string = '';
    private hasUciOk: boolean = false;
    private hasReadyOk: boolean = false;
    constructor(config: EngineConfig) {
        super();
        this.config = config;
    }
    async start(timeoutMs: number = 10000): Promise<void> {
        return new Promise((resolve, reject) => {
            let settled = false;
            let timeout: NodeJS.Timeout | undefined;
            const cleanup = () => {
                if (timeout)
                    clearTimeout(timeout);
                this.off('uciok', onUciOk);
                this.off('close', onCloseBeforeUci);
                this.off('error', onError);
            };
            const safeReject = (err: Error) => {
                if (settled)
                    return;
                settled = true;
                cleanup();
                reject(err);
            };
            const safeResolve = () => {
                if (settled)
                    return;
                settled = true;
                cleanup();
                resolve();
            };
            const onUciOk = () => {
                this.hasUciOk = true;
                safeResolve();
            };
            const onCloseBeforeUci = (code: number | null) => {
                if (this.hasUciOk)
                    return;
                safeReject(new Error(`Engine ${this.config.name} exited before UCI handshake (exit code: ${code ?? 'unknown'})`));
            };
            const onError = (err: Error) => {
                safeReject(err);
            };
            try {
                this.process = spawn(this.config.path, [], {
                    stdio: ['pipe', 'pipe', 'pipe'],
                });
                this.process.stdout?.on('data', (data: Buffer) => {
                    this.buffer += data.toString();
                    const lines = this.buffer.split('\n');
                    this.buffer = lines.pop() || '';
                    for (const line of lines) {
                        this.processLine(line.trim());
                    }
                });
                this.process.stderr?.on('data', (data: Buffer) => {
                    console.error(`[Engine ${this.config.name}] stderr: ${data.toString()}`);
                });
                this.process.on('error', (err) => {
                    console.error(`[Engine ${this.config.name}] process error:`, err);
                    this.emit('error', err);
                });
                this.process.on('close', (code) => {
                    console.log(`[Engine ${this.config.name}] process exited with code ${code}`);
                    this.isReady = false;
                    this.emit('close', code);
                });
                this.sendCommand('uci');
                timeout = setTimeout(() => {
                    safeReject(new Error(`Engine ${this.config.name} did not respond with uciok`));
                }, timeoutMs);
                this.once('uciok', onUciOk);
                this.on('close', onCloseBeforeUci);
                this.on('error', onError);
            }
            catch (err) {
                safeReject(err as Error);
            }
        });
    }
    async waitReady(timeoutMs: number = 10000): Promise<void> {
        return new Promise((resolve, reject) => {
            let settled = false;
            let timeout: NodeJS.Timeout | undefined;
            const cleanup = () => {
                if (timeout)
                    clearTimeout(timeout);
                this.off('readyok', onReadyOk);
                this.off('close', onCloseBeforeReady);
                this.off('error', onError);
            };
            const safeReject = (err: Error) => {
                if (settled)
                    return;
                settled = true;
                cleanup();
                reject(err);
            };
            const safeResolve = () => {
                if (settled)
                    return;
                settled = true;
                cleanup();
                resolve();
            };
            const onReadyOk = () => {
                this.hasReadyOk = true;
                this.isReady = true;
                safeResolve();
            };
            const onCloseBeforeReady = (code: number | null) => {
                if (this.hasReadyOk)
                    return;
                safeReject(new Error(`Engine ${this.config.name} exited before readyok (exit code: ${code ?? 'unknown'})`));
            };
            const onError = (err: Error) => {
                safeReject(err);
            };
            this.sendCommand('isready');
            timeout = setTimeout(() => {
                safeReject(new Error(`Engine ${this.config.name} did not respond with readyok`));
            }, timeoutMs);
            this.once('readyok', onReadyOk);
            this.on('close', onCloseBeforeReady);
            this.on('error', onError);
        });
    }
    sendCommand(command: string): void {
        if (this.process?.stdin?.writable) {
            this.process.stdin.write(command + '\n');
        }
    }
    async newGame(): Promise<void> {
        this.sendCommand('ucinewgame');
        await this.waitReady();
    }
    async go(options: {
        movetime?: number;
        depth?: number;
        nodes?: number;
        wtime?: number;
        btime?: number;
        winc?: number;
        binc?: number;
    }): Promise<string> {
        return new Promise((resolve, reject) => {
            let cmd = 'go';
            if (options.nodes)
                cmd += ` nodes ${options.nodes}`;
            if (options.movetime)
                cmd += ` movetime ${options.movetime}`;
            if (options.depth)
                cmd += ` depth ${options.depth}`;
            if (options.wtime)
                cmd += ` wtime ${options.wtime}`;
            if (options.btime)
                cmd += ` btime ${options.btime}`;
            if (options.winc)
                cmd += ` winc ${options.winc}`;
            if (options.binc)
                cmd += ` binc ${options.binc}`;
            const timeout = setTimeout(() => {
                reject(new Error(`Engine ${this.config.name} did not respond with bestmove`));
            }, 120000);
            this.once('bestmove', (move: string) => {
                clearTimeout(timeout);
                resolve(move);
            });
            this.sendCommand(cmd);
        });
    }
    setPosition(fen?: string, moves?: string[]): void {
        let cmd = 'position';
        if (fen) {
            cmd += ` fen ${fen}`;
        }
        else {
            cmd += ' startpos';
        }
        if (moves && moves.length > 0) {
            cmd += ` moves ${moves.join(' ')}`;
        }
        this.sendCommand(cmd);
    }
    setOption(name: string, value: string | number): void {
        this.sendCommand(`setoption name ${name} value ${value}`);
    }
    stop(): void {
        this.sendCommand('stop');
    }
    quit(): void {
        if (this.process) {
            this.sendCommand('quit');
            setTimeout(() => {
                if (this.process && !this.process.killed) {
                    this.process.kill();
                }
            }, 2000);
            this.process = null;
            this.isReady = false;
            this.hasUciOk = false;
            this.hasReadyOk = false;
        }
    }
    getConfig(): EngineConfig {
        return { ...this.config };
    }
    getName(): string {
        return this.engineName || this.config.name;
    }
    getIsReady(): boolean {
        return this.isReady;
    }
    private processLine(line: string): void {
        if (!line)
            return;
        if (line === 'uciok') {
            this.emit('uciok');
        }
        else if (line === 'readyok') {
            this.emit('readyok');
        }
        else if (line.startsWith('id name ')) {
            this.engineName = line.substring(8);
        }
        else if (line.startsWith('id author ')) {
            this.engineAuthor = line.substring(10);
        }
        else if (line.startsWith('bestmove')) {
            const parts = line.split(' ');
            const move = parts[1];
            const ponder = parts[3] || undefined;
            this.emit('bestmove', move, ponder);
        }
        else if (line.startsWith('info')) {
            const info = this.parseInfo(line);
            if (info.depth) {
                this.emit('info', info);
            }
        }
    }
    private parseInfo(line: string): EngineInfo {
        const info: EngineInfo = {};
        const tokens = line.split(' ');
        for (let i = 1; i < tokens.length; i++) {
            switch (tokens[i]) {
                case 'depth':
                    info.depth = parseInt(tokens[++i]);
                    break;
                case 'score':
                    i++;
                    if (tokens[i] === 'cp') {
                        info.score = { type: 'cp', value: parseInt(tokens[++i]) };
                    }
                    else if (tokens[i] === 'mate') {
                        info.score = { type: 'mate', value: parseInt(tokens[++i]) };
                    }
                    break;
                case 'pv':
                    info.pv = tokens.slice(i + 1).join(' ');
                    i = tokens.length;
                    break;
                case 'nodes':
                    info.nodes = parseInt(tokens[++i]);
                    break;
                case 'nps':
                    info.nps = parseInt(tokens[++i]);
                    break;
                case 'time':
                    info.time = parseInt(tokens[++i]);
                    break;
                case 'multipv':
                    info.multipv = parseInt(tokens[++i]);
                    break;
            }
        }
        return info;
    }
}
