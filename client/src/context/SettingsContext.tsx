import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
    DEFAULT_DESKTOP_SETTINGS,
    initializeDesktopSettings,
    readStoredDesktopSettingsSync,
    writeDesktopSettingsPatch,
} from '../lib/desktopConfig';
import type { AppColorMode, AppLanguage, AppViewId } from '../lib/desktopConfig';
import { APP_STRINGS, LANGUAGE_OPTIONS } from '../i18n';
import type { AppStrings } from '../i18n';

interface SettingsState {
    colorMode: AppColorMode;
    language: AppLanguage;
    animationsEnabled: boolean;
    showBoardCoordinates: boolean;
    compactSidebar: boolean;
    rememberLastView: boolean;
    lastView: AppViewId;
}

interface SettingsContextType extends SettingsState {
    isHydrated: boolean;
    strings: AppStrings;
    languageOptions: Array<{ value: AppLanguage; label: string }>;
    setColorMode: (value: AppColorMode) => void;
    setLanguage: (value: AppLanguage) => void;
    setAnimationsEnabled: (value: boolean) => void;
    setShowBoardCoordinates: (value: boolean) => void;
    setCompactSidebar: (value: boolean) => void;
    setRememberLastView: (value: boolean) => void;
    setLastView: (value: AppViewId) => void;
}

const storedSettings = readStoredDesktopSettingsSync();

const DEFAULT_SETTINGS_STATE: SettingsState = {
    colorMode: storedSettings.colorMode ?? DEFAULT_DESKTOP_SETTINGS.colorMode,
    language: storedSettings.language ?? DEFAULT_DESKTOP_SETTINGS.language,
    animationsEnabled: storedSettings.animationsEnabled ?? DEFAULT_DESKTOP_SETTINGS.animationsEnabled,
    showBoardCoordinates: storedSettings.showBoardCoordinates ?? DEFAULT_DESKTOP_SETTINGS.showBoardCoordinates,
    compactSidebar: storedSettings.compactSidebar ?? DEFAULT_DESKTOP_SETTINGS.compactSidebar,
    rememberLastView: storedSettings.rememberLastView ?? DEFAULT_DESKTOP_SETTINGS.rememberLastView,
    lastView: storedSettings.lastView ?? DEFAULT_DESKTOP_SETTINGS.lastView,
};

const SettingsContext = createContext<SettingsContextType | null>(null);

function applyDocumentSettings(language: AppLanguage, animationsEnabled: boolean) {
    if (typeof document === 'undefined') {
        return;
    }

    document.documentElement.lang = language;
    document.body.dataset.appAnimations = animationsEnabled ? 'on' : 'off';
}

export function useAppSettings() {
    const context = useContext(SettingsContext);
    if (!context) {
        throw new Error('useAppSettings must be used within SettingsProvider');
    }
    return context;
}

export function SettingsProvider({ children }: { children: ReactNode }) {
    const [settings, setSettings] = useState<SettingsState>(DEFAULT_SETTINGS_STATE);
    const [isHydrated, setIsHydrated] = useState(false);

    useEffect(() => {
        let cancelled = false;

        const loadSettings = async () => {
            const stored = await initializeDesktopSettings(DEFAULT_SETTINGS_STATE);
            if (!stored || cancelled) {
                return;
            }

            setSettings({
                colorMode: stored.colorMode ?? DEFAULT_SETTINGS_STATE.colorMode,
                language: stored.language ?? DEFAULT_SETTINGS_STATE.language,
                animationsEnabled: stored.animationsEnabled ?? DEFAULT_SETTINGS_STATE.animationsEnabled,
                showBoardCoordinates: stored.showBoardCoordinates ?? DEFAULT_SETTINGS_STATE.showBoardCoordinates,
                compactSidebar: stored.compactSidebar ?? DEFAULT_SETTINGS_STATE.compactSidebar,
                rememberLastView: stored.rememberLastView ?? DEFAULT_SETTINGS_STATE.rememberLastView,
                lastView: stored.lastView ?? DEFAULT_SETTINGS_STATE.lastView,
            });
        };

        void loadSettings().finally(() => {
            if (!cancelled) {
                setIsHydrated(true);
            }
        });

        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        applyDocumentSettings(settings.language, settings.animationsEnabled);
    }, [settings.animationsEnabled, settings.language]);

    const patchSettings = useCallback((patch: Partial<SettingsState>) => {
        setSettings((current) => {
            const next = { ...current, ...patch };
            void writeDesktopSettingsPatch(patch);
            return next;
        });
    }, []);

    const contextValue = useMemo<SettingsContextType>(() => ({
        ...settings,
        isHydrated,
        strings: APP_STRINGS[settings.language] ?? APP_STRINGS.en,
        languageOptions: LANGUAGE_OPTIONS,
        setColorMode: (value) => patchSettings({ colorMode: value }),
        setLanguage: (value) => patchSettings({ language: value }),
        setAnimationsEnabled: (value) => patchSettings({ animationsEnabled: value }),
        setShowBoardCoordinates: (value) => patchSettings({ showBoardCoordinates: value }),
        setCompactSidebar: (value) => patchSettings({ compactSidebar: value }),
        setRememberLastView: (value) => patchSettings({ rememberLastView: value }),
        setLastView: (value) => patchSettings({ lastView: value }),
    }), [isHydrated, patchSettings, settings]);

    return <SettingsContext.Provider value={contextValue}>{children}</SettingsContext.Provider>;
}
