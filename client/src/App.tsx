import { useState, useEffect } from 'react';
import { ThemeProvider as MuiThemeProvider, CssBaseline } from '@mui/material';
import { ThemeProvider as AppThemeProvider, useAppTheme } from './context/ThemeContext';
import AppShell from './components/Layout/AppShell';
import PlayVsAI from './components/GameSetup/PlayVsAI';
import AIvsAI from './components/GameSetup/AIvsAI';
import GameAnalysisPanel from './components/Analysis/GameAnalysisPanel';
import EngineManagerPanel from './components/EngineManager/EngineManagerPanel';
import { DesktopSplash } from './components/DesktopSplash/DesktopSplash';
import { FirstRunTour } from './components/Onboarding/FirstRunTour';
import { serverUrl } from './lib/server';
import { initializeDesktopSettings, writeDesktopSettingsPatch } from './lib/desktopConfig';

let desktopBackendProcessId: number | null = null;
let desktopBackendStartupPromise: Promise<void> | null = null;
let neutralinoReadyPromise: Promise<void> | null = null;

function getNeutralino() {
    if (typeof window === 'undefined') {
        return null;
    }
    return (window as any).Neutralino ?? null;
}

function joinDesktopPath(basePath: string, fileName: string): string {
    const runtimeWindow = window as any;
    const separator = runtimeWindow.NL_OS === 'Windows' ? '\\' : '/';
    return basePath.endsWith('\\') || basePath.endsWith('/')
        ? `${basePath}${fileName}`
        : `${basePath}${separator}${fileName}`;
}

function getDesktopServerBinaryName(): string {
    return (window as any).NL_OS === 'Windows' ? 'mimu-chess-server.exe' : 'mimu-chess-server';
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

async function ensureDesktopWindowIcon(): Promise<void> {
    const neutralino = getNeutralino();
    if (!neutralino?.window?.setIcon) {
        return;
    }

    try {
        await neutralino.window.setIcon('/dist/MIMU.png');
    }
    catch (error) {
        console.error('Failed to apply desktop window icon:', error);
    }
}

async function resolveDesktopServerBinaryPath(): Promise<string | null> {
    const neutralino = getNeutralino();
    const runtimeWindow = window as any;
    if (!neutralino?.filesystem) {
        return null;
    }

    const binaryName = getDesktopServerBinaryName();
    const candidates = [
        joinDesktopPath(runtimeWindow.NL_PATH, binaryName),
        joinDesktopPath(runtimeWindow.NL_CWD || runtimeWindow.NL_PATH, binaryName),
        binaryName,
    ];

    for (const candidate of candidates) {
        try {
            if (candidate === binaryName) {
                return candidate;
            }
            const stats = await neutralino.filesystem.getStats(candidate);
            if (stats?.isFile) {
                return candidate;
            }
        }
        catch {
            // Try the next candidate.
        }
    }

    return null;
}

async function readOnboardingState(): Promise<boolean> {
    if (typeof window === 'undefined') {
        return true;
    }

    const data = await initializeDesktopSettings({ onboardingCompleted: false });
    return data?.onboardingCompleted === true;
}

async function writeOnboardingState(value: boolean): Promise<void> {
    if (typeof window === 'undefined') {
        return;
    }

    await writeDesktopSettingsPatch({ onboardingCompleted: value });
}

async function isBackendReachable(): Promise<boolean> {
    try {
        const controller = new AbortController();
        const timeoutId = window.setTimeout(() => controller.abort(), 1200);
        const response = await fetch(serverUrl('/api/files/places'), {
            signal: controller.signal,
        });
        window.clearTimeout(timeoutId);
        return response.ok;
    }
    catch {
        return false;
    }
}

async function waitForBackend(timeoutMs: number = 10000): Promise<boolean> {
    const startedAt = Date.now();
    while (Date.now() - startedAt < timeoutMs) {
        if (await isBackendReachable()) {
            return true;
        }
        await new Promise((resolve) => window.setTimeout(resolve, 250));
    }
    return false;
}

async function ensureDesktopBackend(): Promise<void> {
    const neutralino = getNeutralino();
    const runtimeWindow = window as any;
    if (!neutralino) {
        return;
    }
    if (await isBackendReachable()) {
        return;
    }

    if (runtimeWindow.NL_RESMODE !== 'bundle') {
        const didStart = await waitForBackend();
        if (!didStart) {
            console.error('Desktop backend did not become ready.');
        }
        return;
    }

    if (desktopBackendStartupPromise) {
        return desktopBackendStartupPromise;
    }

    if (runtimeWindow.NL_OS === 'Windows') {
        desktopBackendStartupPromise = (async () => {
            const didStart = await waitForBackend();
            if (!didStart) {
                console.error('Bundled Windows desktop backend did not become ready.');
            }
            desktopBackendStartupPromise = null;
        })();

        return desktopBackendStartupPromise;
    }

    if (await isBackendReachable()) {
        return;
    }

    desktopBackendStartupPromise = (async () => {
        await waitForNeutralinoReady();
        const binaryPath = await resolveDesktopServerBinaryPath();
        if (!binaryPath) {
            console.error('Could not locate bundled desktop backend executable.');
            return;
        }
        try {
            const spawned = await neutralino.os.spawnProcess(`"${binaryPath}"`, {
                cwd: runtimeWindow.NL_CWD || runtimeWindow.NL_PATH,
                envs: {
                    PORT: '3001',
                },
            });
            desktopBackendProcessId = spawned.id;

            const didStart = await waitForBackend();
            if (!didStart) {
                console.error(`Desktop backend did not become ready: ${binaryPath}`);
            }
        }
        catch (error) {
            console.error('Failed to launch desktop backend:', error);
        }
        finally {
            desktopBackendStartupPromise = null;
        }
    })();

    return desktopBackendStartupPromise;
}

async function stopDesktopBackend(): Promise<void> {
    const neutralino = getNeutralino();
    if (!neutralino || desktopBackendProcessId === null) {
        return;
    }

    try {
        await neutralino.os.updateSpawnedProcess(desktopBackendProcessId, 'exit');
    }
    catch (error) {
        console.error('Failed to stop desktop backend cleanly:', error);
    }
    finally {
        desktopBackendProcessId = null;
        desktopBackendStartupPromise = null;
    }
}

function AppContent() {
    const { muiTheme } = useAppTheme();
    const [activeView, setActiveView] = useState('play');
    const [isAppReady, setIsAppReady] = useState(false);
    const [showFirstRunTour, setShowFirstRunTour] = useState(false);

    useEffect(() => {
        const neutralino = getNeutralino();
        const handleWindowClose = async () => {
            await stopDesktopBackend();
            if (neutralino) {
                await neutralino.app.exit();
            }
        };
        const handleWindowCloseEvent = () => {
            void handleWindowClose();
        };
        const handleSpawnedProcess = (evt: CustomEvent) => {
            if (evt.detail?.id === desktopBackendProcessId && evt.detail?.action === 'exit') {
                desktopBackendProcessId = null;
            }
        };
        const handleBeforeUnload = () => {
            void stopDesktopBackend();
        };

        if (neutralino) {
            neutralino.init();
            void waitForNeutralinoReady().then(() => ensureDesktopWindowIcon());
            void initializeDesktopSettings({ onboardingCompleted: false });
            void neutralino.events.on('windowClose', handleWindowCloseEvent);
            void neutralino.events.on('spawnedProcess', handleSpawnedProcess);
        }

        window.addEventListener('beforeunload', handleBeforeUnload);

        let cancelled = false;
        const startup = async () => {
            await Promise.all([
                new Promise((resolve) => setTimeout(resolve, 3000)),
                ensureDesktopBackend(),
            ]);
            if (!cancelled) {
                setIsAppReady(true);
            }
        };
        void startup();

        return () => {
            cancelled = true;
            window.removeEventListener('beforeunload', handleBeforeUnload);
            if (neutralino) {
                void neutralino.events.off('windowClose', handleWindowCloseEvent);
                void neutralino.events.off('spawnedProcess', handleSpawnedProcess);
            }
        };
    }, []);

    useEffect(() => {
        if (!isAppReady) {
            return;
        }

        let cancelled = false;

        const loadOnboardingState = async () => {
            const hasCompletedTour = await readOnboardingState();
            if (!cancelled) {
                setShowFirstRunTour(!hasCompletedTour);
            }
        };

        void loadOnboardingState();

        return () => {
            cancelled = true;
        };
    }, [isAppReady]);

    const handleFinishFirstRunTour = () => {
        void writeOnboardingState(true);
        setShowFirstRunTour(false);
    };

    const renderView = () => {
        switch (activeView) {
            case 'play':
                return <PlayVsAI />;
            case 'match':
                return <AIvsAI />;
            case 'analysis':
                return <GameAnalysisPanel />;
            case 'engines':
                return <EngineManagerPanel />;
            default:
                return <PlayVsAI />;
        }
    };

    return (
        <MuiThemeProvider theme={muiTheme}>
            <CssBaseline />
            {!isAppReady ? (
                <DesktopSplash />
            ) : (
                <>
                    <AppShell activeView={activeView} onViewChange={setActiveView}>
                        {renderView()}
                    </AppShell>
                    <FirstRunTour
                        open={showFirstRunTour}
                        activeView={activeView}
                        onViewChange={setActiveView}
                        onFinish={handleFinishFirstRunTour}
                    />
                </>
            )}
        </MuiThemeProvider>
    );
}

function App() {
    return (
        <AppThemeProvider>
            <AppContent />
        </AppThemeProvider>
    );
}

export default App;
