type DesktopSettings = {
    themeId?: string;
    onboardingCompleted?: boolean;
    customThemeColor?: string;
};

export const DEFAULT_DESKTOP_SETTINGS: Required<DesktopSettings> = {
    themeId: 'cappuccino',
    onboardingCompleted: false,
    customThemeColor: '#7c4dff',
};

const LOCAL_SETTINGS_STORAGE_KEY = 'mimu-chess:desktop-settings';
const NATIVE_SETTINGS_STORAGE_KEY = 'mimu-chess-desktop-settings';

let settingsCache: DesktopSettings | null = null;
let settingsWriteQueue: Promise<boolean> = Promise.resolve(true);
let neutralinoReadyPromise: Promise<void> | null = null;

function getNeutralino() {
    if (typeof window === 'undefined') {
        return null;
    }
    return (window as any).Neutralino ?? null;
}

async function waitForNeutralinoReady(): Promise<void> {
    const neutralino = getNeutralino();
    if (!neutralino) {
        return;
    }

    neutralino.init();

    if (!neutralinoReadyPromise) {
        neutralinoReadyPromise = new Promise((resolve) => {
            let resolved = false;
            const finish = () => {
                if (!resolved) {
                    resolved = true;
                    resolve();
                }
            };

            void neutralino.events.on('ready', finish);
            window.setTimeout(finish, 500);
        });
    }

    return neutralinoReadyPromise;
}

function sanitizeDesktopSettings(value: unknown): DesktopSettings {
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

    if (typeof raw.customThemeColor === 'string' && /^#[0-9a-fA-F]{6}$/.test(raw.customThemeColor)) {
        next.customThemeColor = raw.customThemeColor;
    }

    return next;
}

function readLocalSettings(): DesktopSettings {
    if (typeof window === 'undefined') {
        return {};
    }

    try {
        return sanitizeDesktopSettings(JSON.parse(window.localStorage.getItem(LOCAL_SETTINGS_STORAGE_KEY) || '{}'));
    }
    catch {
        return {};
    }
}

function writeLocalSettings(settings: DesktopSettings): void {
    if (typeof window === 'undefined') {
        return;
    }

    window.localStorage.setItem(
        LOCAL_SETTINGS_STORAGE_KEY,
        JSON.stringify(sanitizeDesktopSettings(settings)),
    );
}

async function readNativeSettings(): Promise<DesktopSettings | null> {
    const neutralino = getNeutralino();
    if (!neutralino?.storage) {
        return null;
    }

    await waitForNeutralinoReady();

    try {
        const raw = await neutralino.storage.getData(NATIVE_SETTINGS_STORAGE_KEY);
        return sanitizeDesktopSettings(JSON.parse(raw));
    }
    catch {
        return null;
    }
}

async function writeNativeSettings(settings: DesktopSettings): Promise<boolean> {
    const neutralino = getNeutralino();
    if (!neutralino?.storage) {
        return true;
    }

    await waitForNeutralinoReady();

    try {
        await neutralino.storage.setData(
            NATIVE_SETTINGS_STORAGE_KEY,
            JSON.stringify(sanitizeDesktopSettings(settings), null, 2),
        );
        return true;
    }
    catch {
        return false;
    }
}

export async function readDesktopSettings(): Promise<DesktopSettings | null> {
    const nativeSettings = await readNativeSettings();
    const localSettings = readLocalSettings();
    const next = sanitizeDesktopSettings({
        ...DEFAULT_DESKTOP_SETTINGS,
        ...nativeSettings,
        ...localSettings,
    });

    settingsCache = next;
    writeLocalSettings(next);

    return next;
}

export async function initializeDesktopSettings(defaults: Partial<DesktopSettings> = {}): Promise<DesktopSettings | null> {
    const existing = settingsCache ?? (await readDesktopSettings()) ?? {};
    const next = sanitizeDesktopSettings({
        ...DEFAULT_DESKTOP_SETTINGS,
        ...defaults,
        ...existing,
    });

    settingsCache = next;
    writeLocalSettings(next);
    await writeNativeSettings(next);

    return next;
}

export async function writeDesktopSettingsPatch(patch: Partial<DesktopSettings>): Promise<boolean> {
    const optimisticSettings = sanitizeDesktopSettings({
        ...DEFAULT_DESKTOP_SETTINGS,
        ...(settingsCache ?? readLocalSettings()),
        ...patch,
    });

    settingsCache = optimisticSettings;
    writeLocalSettings(optimisticSettings);

    settingsWriteQueue = settingsWriteQueue.then(async () => {
        const next = settingsCache ?? optimisticSettings;
        return writeNativeSettings(next);
    }).catch(() => false);

    return settingsWriteQueue;
}
