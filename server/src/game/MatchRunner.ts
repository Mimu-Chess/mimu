import { EventEmitter } from 'events';
import { Chess } from 'chess.js';
import { UCIEngine, EngineInfo } from '../engine/UCIEngine.js';
import { EngineManager } from '../engine/EngineManager.js';
import { generatePGN } from '../utils/pgn.js';
export interface MatchConfig {
    whiteEngine: string;
    blackEngine: string;
    games: number;
    movetime?: number;
    depth?: number;
    nodes?: number;
}
export interface MatchResult {
    gameNumber: number;
    white: string;
    black: string;
    result: string;
    pgn: string;
    moves: string[];
}
export interface MatchScore {
    white: {
        name: string;
        score: number;
    };
    black: {
        name: string;
        score: number;
    };
    draws: number;
    gamesPlayed: number;
    totalGames: number;
}
export class MatchRunner extends EventEmitter {
    private engineManager: EngineManager;
    private isRunning: boolean = false;
    private results: MatchResult[] = [];
    private config: MatchConfig | null = null;
    constructor(engineManager: EngineManager) {
        super();
        this.engineManager = engineManager;
    }
    async startMatch(config: MatchConfig): Promise<void> {
        this.config = config;
        this.isRunning = true;
        this.results = [];
        this.emit('match-start', config);
        for (let gameNum = 1; gameNum <= config.games; gameNum++) {
            if (!this.isRunning)
                break;
            const isSwapped = gameNum % 2 === 0;
            const whiteName = isSwapped ? config.blackEngine : config.whiteEngine;
            const blackName = isSwapped ? config.whiteEngine : config.blackEngine;
            try {
                const result = await this.playGame(gameNum, whiteName, blackName, config);
                this.results.push(result);
                this.emit('match-update', {
                    result,
                    score: this.getScore(),
                });
            }
            catch (err) {
                console.error(`Error in game ${gameNum}:`, err);
                this.emit('match-error', { gameNum, error: (err as Error).message });
            }
        }
        this.isRunning = false;
        this.emit('match-end', {
            results: this.results,
            score: this.getScore(),
        });
    }
    private async playGame(gameNum: number, whiteName: string, blackName: string, config: MatchConfig): Promise<MatchResult> {
        const chess = new Chess();
        const uciMoves: string[] = [];
        const whiteEngine = await this.engineManager.startEngine(whiteName);
        const blackEngine = await this.engineManager.startEngine(blackName);
        await whiteEngine.newGame();
        await blackEngine.newGame();
        this.emit('game-start', { gameNum, white: whiteName, black: blackName });
        while (!chess.isGameOver() && this.isRunning) {
            const currentTurn = chess.turn();
            const engine = currentTurn === 'w' ? whiteEngine : blackEngine;
            engine.setPosition(undefined, uciMoves.length > 0 ? uciMoves : undefined);
            const infoHandler = (info: EngineInfo) => {
                this.emit('engine-info', { gameNum, side: currentTurn, info });
            };
            engine.on('info', infoHandler);
            const engineCfg = this.engineManager.getEngineConfig(currentTurn === 'w' ? whiteName : blackName);
            const goOptions: any = {};
            if (engineCfg?.nodes) {
                goOptions.nodes = engineCfg.nodes;
            }
            else if (config.nodes) {
                goOptions.nodes = config.nodes;
            }
            else if (config.movetime) {
                goOptions.movetime = config.movetime;
            }
            else if (config.depth) {
                goOptions.depth = config.depth;
            }
            else {
                goOptions.movetime = 1000;
            }
            const bestmove = await engine.go(goOptions);
            engine.off('info', infoHandler);
            if (!this.isRunning)
                break;
            const from = bestmove.substring(0, 2);
            const to = bestmove.substring(2, 4);
            const promotion = bestmove.length > 4 ? bestmove.substring(4, 5) : undefined;
            const move = chess.move({ from, to, promotion: promotion as any });
            if (!move) {
                console.error(`Invalid move from ${currentTurn === 'w' ? whiteName : blackName}: ${bestmove}`);
                break;
            }
            uciMoves.push(bestmove);
            const history = chess.history({ verbose: true });
            const lastMove = history[history.length - 1];
            this.emit('game-state', {
                gameNum,
                fen: chess.fen(),
                movesSan: chess.history(),
                lastMove: lastMove ? { from: lastMove.from, to: lastMove.to } : undefined,
                isGameOver: chess.isGameOver(),
            });
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        let result: string;
        if (chess.isCheckmate()) {
            result = chess.turn() === 'w' ? '0-1' : '1-0';
        }
        else if (chess.isDraw()) {
            result = '1/2-1/2';
        }
        else {
            result = '*';
        }
        const pgn = generatePGN({
            white: whiteName,
            black: blackName,
            result,
            moves: chess.history(),
            date: new Date(),
            event: `Match Game ${gameNum}`,
        });
        return {
            gameNumber: gameNum,
            white: whiteName,
            black: blackName,
            result,
            pgn,
            moves: chess.history(),
        };
    }
    stopMatch(): void {
        this.isRunning = false;
        this.engineManager.stopAllEngines();
    }
    getScore(): MatchScore {
        if (!this.config) {
            return {
                white: { name: '', score: 0 },
                black: { name: '', score: 0 },
                draws: 0,
                gamesPlayed: 0,
                totalGames: 0,
            };
        }
        let whiteScore = 0;
        let blackScore = 0;
        let draws = 0;
        for (const result of this.results) {
            const isWhiteOriginal = result.white === this.config.whiteEngine;
            if (result.result === '1-0') {
                if (isWhiteOriginal)
                    whiteScore += 1;
                else
                    blackScore += 1;
            }
            else if (result.result === '0-1') {
                if (isWhiteOriginal)
                    blackScore += 1;
                else
                    whiteScore += 1;
            }
            else if (result.result === '1/2-1/2') {
                whiteScore += 0.5;
                blackScore += 0.5;
                draws++;
            }
        }
        return {
            white: { name: this.config.whiteEngine, score: whiteScore },
            black: { name: this.config.blackEngine, score: blackScore },
            draws,
            gamesPlayed: this.results.length,
            totalGames: this.config.games,
        };
    }
    getResults(): MatchResult[] {
        return [...this.results];
    }
    isMatchRunning(): boolean {
        return this.isRunning;
    }
}
