import { Chess, Move } from 'chess.js';
import { EventEmitter } from 'events';
import { UCIEngine, EngineInfo } from '../engine/UCIEngine.js';
import { EngineManager } from '../engine/EngineManager.js';
export interface GameConfig {
    mode: 'human-vs-ai' | 'ai-vs-ai';
    whiteEngine?: string;
    blackEngine?: string;
    humanColor?: 'white' | 'black';
    movetime?: number;
    depth?: number;
    nodes?: number;
}
export interface GameState {
    fen: string;
    moves: string[];
    movesSan: string[];
    result: string | null;
    turn: 'w' | 'b';
    isCheck: boolean;
    isCheckmate: boolean;
    isDraw: boolean;
    isStalemate: boolean;
    isGameOver: boolean;
    lastMove?: {
        from: string;
        to: string;
    };
}
export class GameManager extends EventEmitter {
    private chess: Chess;
    private config: GameConfig | null = null;
    private engineManager: EngineManager;
    private whiteEngine: UCIEngine | null = null;
    private blackEngine: UCIEngine | null = null;
    private isRunning: boolean = false;
    private uciMoves: string[] = [];
    constructor(engineManager: EngineManager) {
        super();
        this.chess = new Chess();
        this.engineManager = engineManager;
    }
    async startGame(config: GameConfig): Promise<GameState> {
        this.chess = new Chess();
        this.config = config;
        this.uciMoves = [];
        this.isRunning = true;
        if (config.mode === 'human-vs-ai') {
            const engineName = config.humanColor === 'white' ? config.blackEngine : config.whiteEngine;
            if (!engineName)
                throw new Error('Engine not specified');
            const engine = await this.engineManager.startEngine(engineName);
            await engine.newGame();
            if (config.humanColor === 'white') {
                this.blackEngine = engine;
            }
            else {
                this.whiteEngine = engine;
            }
        }
        else if (config.mode === 'ai-vs-ai') {
            if (!config.whiteEngine || !config.blackEngine) {
                throw new Error('Both engines must be specified for AI vs AI');
            }
            this.whiteEngine = await this.engineManager.startEngine(config.whiteEngine);
            this.blackEngine = await this.engineManager.startEngine(config.blackEngine);
            await this.whiteEngine.newGame();
            await this.blackEngine.newGame();
        }
        const state = this.getState();
        this.emit('state', state);
        if (config.mode === 'human-vs-ai' && config.humanColor === 'black') {
            this.makeEngineMove();
        }
        return state;
    }
    async makeHumanMove(from: string, to: string, promotion?: string): Promise<GameState | null> {
        if (!this.isRunning || !this.config)
            return null;
        try {
            const move = this.chess.move({ from, to, promotion: promotion as any });
            if (!move)
                return null;
            this.uciMoves.push(`${from}${to}${promotion || ''}`);
            const state = this.getState();
            this.emit('state', state);
            if (state.isGameOver) {
                this.isRunning = false;
                this.emit('gameover', state);
                return state;
            }
            if (this.config.mode === 'human-vs-ai') {
                this.makeEngineMove();
            }
            return state;
        }
        catch (err) {
            return null;
        }
    }
    async makeEngineMove(): Promise<void> {
        if (!this.isRunning || !this.config)
            return;
        const currentTurn = this.chess.turn();
        const engine = currentTurn === 'w' ? this.whiteEngine : this.blackEngine;
        if (!engine)
            return;
        try {
            engine.setPosition(undefined, this.uciMoves.length > 0 ? this.uciMoves : undefined);
            const infoHandler = (info: EngineInfo) => {
                this.emit('engine-info', info);
            };
            engine.on('info', infoHandler);
            const engineName = currentTurn === 'w'
                ? (this.config.mode === 'human-vs-ai' ? (this.config.humanColor === 'black' ? this.config.whiteEngine : this.config.blackEngine) : this.config.whiteEngine)
                : (this.config.mode === 'human-vs-ai' ? (this.config.humanColor === 'white' ? this.config.blackEngine : this.config.whiteEngine) : this.config.blackEngine);
            const engineCfg = engineName ? this.engineManager.getEngineConfig(engineName) : undefined;
            const goOptions: any = {};
            if (engineCfg?.nodes) {
                goOptions.nodes = engineCfg.nodes;
            }
            else if (this.config.nodes) {
                goOptions.nodes = this.config.nodes;
            }
            else if (this.config.movetime) {
                goOptions.movetime = this.config.movetime;
            }
            else if (this.config.depth) {
                goOptions.depth = this.config.depth;
            }
            else {
                goOptions.movetime = 1000;
            }
            const bestmove = await engine.go(goOptions);
            engine.off('info', infoHandler);
            if (!this.isRunning)
                return;
            const from = bestmove.substring(0, 2);
            const to = bestmove.substring(2, 4);
            const promotion = bestmove.length > 4 ? bestmove.substring(4, 5) : undefined;
            const move = this.chess.move({ from, to, promotion: promotion as any });
            if (move) {
                this.uciMoves.push(bestmove);
                const state = this.getState();
                this.emit('state', state);
                if (state.isGameOver) {
                    this.isRunning = false;
                    this.emit('gameover', state);
                }
            }
        }
        catch (err) {
            console.error('Engine move error:', err);
            this.emit('error', err);
        }
    }
    undoMove(): GameState | null {
        if (!this.config || this.config.mode !== 'human-vs-ai')
            return null;
        this.chess.undo();
        this.chess.undo();
        this.uciMoves.pop();
        this.uciMoves.pop();
        const state = this.getState();
        this.emit('state', state);
        return state;
    }
    resign(color: 'white' | 'black'): GameState {
        this.isRunning = false;
        if (this.whiteEngine) {
            this.whiteEngine.stop();
        }
        if (this.blackEngine) {
            this.blackEngine.stop();
        }
        const state = this.getState();
        state.result = color === 'white' ? '0-1' : '1-0';
        this.emit('state', state);
        this.emit('gameover', state);
        return state;
    }
    stopGame(): void {
        this.isRunning = false;
        if (this.whiteEngine) {
            this.whiteEngine.stop();
        }
        if (this.blackEngine) {
            this.blackEngine.stop();
        }
    }
    getState(): GameState {
        const history = this.chess.history({ verbose: true });
        const lastMove = history.length > 0 ? history[history.length - 1] : undefined;
        return {
            fen: this.chess.fen(),
            moves: this.uciMoves,
            movesSan: this.chess.history(),
            result: this.chess.isCheckmate()
                ? (this.chess.turn() === 'w' ? '0-1' : '1-0')
                : this.chess.isDraw()
                    ? '1/2-1/2'
                    : null,
            turn: this.chess.turn(),
            isCheck: this.chess.isCheck(),
            isCheckmate: this.chess.isCheckmate(),
            isDraw: this.chess.isDraw(),
            isStalemate: this.chess.isStalemate(),
            isGameOver: this.chess.isGameOver(),
            lastMove: lastMove ? { from: lastMove.from, to: lastMove.to } : undefined,
        };
    }
    getConfig(): GameConfig | null {
        return this.config;
    }
    isGameRunning(): boolean {
        return this.isRunning;
    }
    getChess(): Chess {
        return this.chess;
    }
    getUciMoves(): string[] {
        return [...this.uciMoves];
    }
}
