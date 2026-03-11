import { EventEmitter } from 'events';
import { EngineManager } from '../engine/EngineManager.js';
import { UCIEngine, type EngineInfo } from '../engine/UCIEngine.js';

export interface AnalysisRequest {
    engineName: string;
    positions: Array<{
        plyIndex: number;
        fen: string;
    }>;
    movetime?: number;
}

export interface AnalysisProgress {
    plyIndex: number;
    bestmove: string;
    fen: string;
    engineName: string;
    info: EngineInfo | null;
}

export class AnalysisManager extends EventEmitter {
    private readonly engineManager: EngineManager;
    private engine: UCIEngine | null = null;
    private engineName: string | null = null;
    private searchToken = 0;
    private latestInfo: EngineInfo | null = null;
    private activeInfoHandler: ((info: EngineInfo) => void) | null = null;

    constructor(engineManager: EngineManager) {
        super();
        this.engineManager = engineManager;
    }

    async analyze(request: AnalysisRequest): Promise<void> {
        const token = ++this.searchToken;
        const engine = await this.ensureEngine(request.engineName);
        const config = this.engineManager.getEngineConfig(request.engineName);

        // Cancel any in-flight search before starting a new one.
        engine.stop();
        if (this.activeInfoHandler) {
            engine.off('info', this.activeInfoHandler);
            this.activeInfoHandler = null;
        }

        try {
            for (const position of request.positions) {
                if (token !== this.searchToken) {
                    return;
                }

                this.latestInfo = null;
                const infoHandler = (info: EngineInfo) => {
                    if (token !== this.searchToken) {
                        return;
                    }
                    this.latestInfo = info;
                    this.emit('info', {
                        plyIndex: position.plyIndex,
                        info,
                    });
                };

                this.activeInfoHandler = infoHandler;
                engine.on('info', infoHandler);

                try {
                    engine.setPosition(position.fen === 'start' ? undefined : position.fen);
                    const bestmove = await engine.go({
                        nodes: config?.nodes,
                        movetime: config?.nodes ? undefined : (request.movetime || 1500),
                    });

                    if (token !== this.searchToken) {
                        return;
                    }

                    this.emit('progress', {
                        plyIndex: position.plyIndex,
                        bestmove,
                        fen: position.fen,
                        engineName: request.engineName,
                        info: this.latestInfo,
                    } satisfies AnalysisProgress);
                }
                finally {
                    if (this.activeInfoHandler === infoHandler) {
                        engine.off('info', infoHandler);
                        this.activeInfoHandler = null;
                    }
                }
            }

            if (token === this.searchToken) {
                this.emit('complete', {
                    engineName: request.engineName,
                    analyzedPositions: request.positions.length,
                });
            }
        }
        catch (error) {
            if (token === this.searchToken) {
                this.emit('error', error);
            }
        }
    }

    stop(): void {
        this.searchToken += 1;
        this.latestInfo = null;
        if (this.engine) {
            if (this.activeInfoHandler) {
                this.engine.off('info', this.activeInfoHandler);
                this.activeInfoHandler = null;
            }
            this.engine.stop();
        }
    }

    dispose(): void {
        this.stop();
        if (this.engine) {
            this.engine.quit();
            this.engine = null;
            this.engineName = null;
        }
    }

    private async ensureEngine(engineName: string): Promise<UCIEngine> {
        if (this.engine && this.engineName === engineName && this.engine.getIsReady()) {
            return this.engine;
        }

        if (this.engine) {
            this.engine.quit();
            this.engine = null;
            this.engineName = null;
        }

        const config = this.engineManager.getEngineConfig(engineName);
        if (!config) {
            throw new Error(`Engine "${engineName}" not found`);
        }

        const engine = new UCIEngine(config);
        await engine.start();
        if (config.hasWeightsFile && config.weightsFile) {
            engine.setOption('WeightsFile', config.weightsFile);
        }
        await engine.waitReady();

        this.engine = engine;
        this.engineName = engineName;
        return engine;
    }
}
