import fs from 'fs';
import path from 'path';
import { getConfigDirectory } from './appPaths.js';

export interface DesktopSettings {
    themeId?: string;
    onboardingCompleted?: boolean;
}

export const DEFAULT_DESKTOP_SETTINGS: Required<DesktopSettings> = {
    themeId: 'cappuccino',
    onboardingCompleted: false,
};

function sanitizeSettings(value: unknown): DesktopSettings {
    if (!value || typeof value !== 'object') {
        return {};
    }

    const raw = value as Record<string, unknown>;
    const next: DesktopSettings = {};

    if (typeof raw.themeId === 'string' && raw.themeId.trim()) {
        next.themeId = raw.themeId;
    }

    if (typeof raw.onboardingCompleted === 'boolean') {
        next.onboardingCompleted = raw.onboardingCompleted;
    }

    return next;
}

export class SettingsStore {
    private readonly settingsDir = getConfigDirectory();
    private readonly settingsFile = path.join(this.settingsDir, 'settings.json');

    constructor() {
        this.ensureInitialized();
    }

    getFilePath(): string {
        return this.settingsFile;
    }

    read(): Required<DesktopSettings> {
        this.ensureInitialized();

        try {
            const raw = fs.readFileSync(this.settingsFile, 'utf-8');
            return this.withDefaults(JSON.parse(raw));
        }
        catch {
            const defaults = { ...DEFAULT_DESKTOP_SETTINGS };
            this.write(defaults);
            return defaults;
        }
    }

    patch(patch: Partial<DesktopSettings>): Required<DesktopSettings> {
        const next = this.withDefaults({
            ...this.read(),
            ...sanitizeSettings(patch),
        });
        this.write(next);
        return next;
    }

    private withDefaults(value: unknown): Required<DesktopSettings> {
        return {
            ...DEFAULT_DESKTOP_SETTINGS,
            ...sanitizeSettings(value),
        };
    }

    private ensureInitialized(): void {
        fs.mkdirSync(this.settingsDir, { recursive: true });
        if (!fs.existsSync(this.settingsFile)) {
            this.write(DEFAULT_DESKTOP_SETTINGS);
        }
    }

    private write(settings: Required<DesktopSettings>): void {
        fs.mkdirSync(this.settingsDir, { recursive: true });
        fs.writeFileSync(this.settingsFile, JSON.stringify(settings, null, 2));
    }
}
