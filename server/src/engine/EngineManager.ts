import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { UCIEngine, EngineConfig } from './UCIEngine.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LEGACY_ENGINES_FILE = path.join(__dirname, '..', '..', 'engines.json');

function getConfigDirectory(): string {
    const appFolderName = 'Mimu Chess';

    switch (process.platform) {
        case 'win32':
            return path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'), appFolderName);
        case 'darwin':
            return path.join(os.homedir(), 'Library', 'Application Support', appFolderName);
        default:
            return path.join(process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config'), 'mimu-chess');
    }
}

const ENGINES_DIR = getConfigDirectory();
const ENGINES_FILE = path.join(ENGINES_DIR, 'engines.json');
export class EngineManager {
    private engines: EngineConfig[] = [];
    private runningEngines: Map<string, UCIEngine> = new Map();
    constructor() {
        this.loadEngines();
    }
    private ensureStorageDirectory(): void {
        fs.mkdirSync(ENGINES_DIR, { recursive: true });
    }
    private migrateLegacyEnginesFile(): void {
        if (fs.existsSync(ENGINES_FILE) || !fs.existsSync(LEGACY_ENGINES_FILE)) {
            return;
        }
        this.ensureStorageDirectory();
        fs.copyFileSync(LEGACY_ENGINES_FILE, ENGINES_FILE);
        console.log(`Migrated engine config to ${ENGINES_FILE}`);
    }
    private loadEngines(): void {
        try {
            this.migrateLegacyEnginesFile();

            if (fs.existsSync(ENGINES_FILE)) {
                const data = fs.readFileSync(ENGINES_FILE, 'utf-8');
                this.engines = JSON.parse(data);
            }
            else {
                this.engines = [];
                this.saveEngines();
            }
        }
        catch (err) {
            console.error(`Failed to load engine config from ${ENGINES_FILE}:`, err);
            this.engines = [];
        }
    }
    private saveEngines(): void {
        try {
            this.ensureStorageDirectory();
            fs.writeFileSync(ENGINES_FILE, JSON.stringify(this.engines, null, 2));
        }
        catch (err) {
            console.error(`Failed to save engine config to ${ENGINES_FILE}:`, err);
        }
    }
    getEngines(): EngineConfig[] {
        return [...this.engines];
    }
    private async validateEngineConfig(engineConfig: {
        name: string;
        path: string;
        weightsConfig?: {
            weightsFile: string;
            nodes: number;
        };
    }): Promise<EngineConfig> {
        if (!fs.existsSync(engineConfig.path)) {
            throw new Error(`Engine executable not found at: ${engineConfig.path}`);
        }
        if (engineConfig.weightsConfig && !fs.existsSync(engineConfig.weightsConfig.weightsFile)) {
            throw new Error(`Weights file not found at: ${engineConfig.weightsConfig.weightsFile}`);
        }
        const config: EngineConfig = {
            name: engineConfig.name,
            path: engineConfig.path,
            type: 'uci',
            ...(engineConfig.weightsConfig && {
                hasWeightsFile: true,
                weightsFile: engineConfig.weightsConfig.weightsFile,
                nodes: engineConfig.weightsConfig.nodes,
            }),
        };
        const testEngine = new UCIEngine(config);
        try {
            if (config.hasWeightsFile && config.weightsFile) {
                await testEngine.start(5000);
                testEngine.setOption('WeightsFile', config.weightsFile);
                await testEngine.waitReady(15000);
            }
            else {
                await testEngine.start(3000);
                await testEngine.waitReady(3000);
            }
            testEngine.quit();
            return config;
        }
        catch (err) {
            testEngine.quit();
            throw new Error(`Failed to validate UCI engine: ${(err as Error).message}`);
        }
    }
    async addEngine(engineConfig: {
        name: string;
        path: string;
        weightsConfig?: {
            weightsFile: string;
            nodes: number;
        };
    }): Promise<EngineConfig> {
        if (this.engines.some(e => e.name === engineConfig.name)) {
            throw new Error(`Engine with name "${engineConfig.name}" already exists`);
        }
        const config = await this.validateEngineConfig(engineConfig);
        this.engines.push(config);
        this.saveEngines();
        return config;
    }
    async updateEngine(oldName: string, engineConfig: {
        name: string;
        path: string;
        weightsConfig?: {
            weightsFile: string;
            nodes: number;
        };
    }): Promise<EngineConfig> {
        const index = this.engines.findIndex(e => e.name === oldName);
        if (index === -1) {
            throw new Error(`Engine "${oldName}" not found`);
        }
        if (this.engines.some(e => e.name === engineConfig.name && e.name !== oldName)) {
            throw new Error(`Engine with name "${engineConfig.name}" already exists`);
        }
        const config = await this.validateEngineConfig(engineConfig);
        this.stopEngine(oldName);
        if (config.name !== oldName) {
            this.stopEngine(config.name);
        }
        this.engines[index] = config;
        this.saveEngines();
        return config;
    }
    removeEngine(name: string): boolean {
        const index = this.engines.findIndex(e => e.name === name);
        if (index === -1)
            return false;
        const running = this.runningEngines.get(name);
        if (running) {
            running.quit();
            this.runningEngines.delete(name);
        }
        this.engines.splice(index, 1);
        this.saveEngines();
        return true;
    }
    async startEngine(name: string): Promise<UCIEngine> {
        const config = this.engines.find(e => e.name === name);
        if (!config) {
            throw new Error(`Engine "${name}" not found`);
        }
        const existing = this.runningEngines.get(name);
        if (existing && existing.getIsReady()) {
            return existing;
        }
        const engine = new UCIEngine(config);
        await engine.start();
        if (config.hasWeightsFile && config.weightsFile) {
            engine.setOption('WeightsFile', config.weightsFile);
        }
        await engine.waitReady();
        this.runningEngines.set(name, engine);
        return engine;
    }
    stopEngine(name: string): void {
        const engine = this.runningEngines.get(name);
        if (engine) {
            engine.quit();
            this.runningEngines.delete(name);
        }
    }
    stopAllEngines(): void {
        for (const [, engine] of this.runningEngines) {
            engine.quit();
        }
        this.runningEngines.clear();
    }
    getRunningEngine(name: string): UCIEngine | undefined {
        return this.runningEngines.get(name);
    }
    getEngineConfig(name: string): EngineConfig | undefined {
        return this.engines.find(e => e.name === name);
    }
}
