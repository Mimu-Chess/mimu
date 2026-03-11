import { createContext, useContext, useState, useMemo, useCallback, useEffect } from 'react';
import type { ReactNode } from 'react';
import { alpha, createTheme } from '@mui/material/styles';
import type { Theme } from '@mui/material/styles';
import { initializeDesktopSettings, writeDesktopSettingsPatch } from '../lib/desktopConfig';

const THEME_STORAGE_KEY = 'mimu-theme';
export interface AppTheme {
    id: string;
    name: string;
    boardLight: string;
    boardDark: string;
    highlightFrom: string;
    highlightTo: string;
    selected: string;
    legalDot: string;
    legalCapture: string;
    primary: string;
    secondary: string;
    bgDefault: string;
    bgPaper: string;
    bgSidebar: string;
    accent: string;
}
export const APP_THEMES: AppTheme[] = [
    {
        id: 'cappuccino',
        name: 'Cappuccino',
        boardLight: '#e8d5b7',
        boardDark: '#a07850',
        highlightFrom: 'rgba(210, 145, 70, 0.30)',
        highlightTo: 'rgba(210, 145, 70, 0.45)',
        selected: 'rgba(210, 145, 70, 0.55)',
        legalDot: 'rgba(160, 100, 40, 0.30)',
        legalCapture: 'rgba(160, 100, 40, 0.38)',
        primary: '#c87941',
        secondary: '#e8b88a',
        bgDefault: '#1c1410',
        bgPaper: '#261d17',
        bgSidebar: '#1a120e',
        accent: '#c87941',
    },
    {
        id: 'midnight',
        name: 'Midnight',
        boardLight: '#2d2d44',
        boardDark: '#1a1a2e',
        highlightFrom: 'rgba(124, 77, 255, 0.25)',
        highlightTo: 'rgba(124, 77, 255, 0.35)',
        selected: 'rgba(124, 77, 255, 0.5)',
        legalDot: 'rgba(124, 77, 255, 0.35)',
        legalCapture: 'rgba(124, 77, 255, 0.4)',
        primary: '#7c4dff',
        secondary: '#00e5ff',
        bgDefault: '#0a0e1a',
        bgPaper: '#111827',
        bgSidebar: '#0d1120',
        accent: '#7c4dff',
    },
    {
        id: 'classic',
        name: 'Classic',
        boardLight: '#f0d9b5',
        boardDark: '#b58863',
        highlightFrom: 'rgba(255, 255, 0, 0.3)',
        highlightTo: 'rgba(255, 255, 0, 0.4)',
        selected: 'rgba(255, 255, 0, 0.5)',
        legalDot: 'rgba(0, 0, 0, 0.2)',
        legalCapture: 'rgba(0, 0, 0, 0.25)',
        primary: '#d4a64a',
        secondary: '#c8956e',
        bgDefault: '#1a1612',
        bgPaper: '#231f1a',
        bgSidebar: '#1a1612',
        accent: '#d4a64a',
    },
    {
        id: 'emerald',
        name: 'Emerald',
        boardLight: '#eeeed2',
        boardDark: '#769656',
        highlightFrom: 'rgba(255, 255, 0, 0.3)',
        highlightTo: 'rgba(255, 255, 0, 0.45)',
        selected: 'rgba(255, 255, 0, 0.5)',
        legalDot: 'rgba(0, 0, 0, 0.18)',
        legalCapture: 'rgba(0, 0, 0, 0.25)',
        primary: '#6aad3d',
        secondary: '#89c157',
        bgDefault: '#121a12',
        bgPaper: '#1a241a',
        bgSidebar: '#101910',
        accent: '#6aad3d',
    },
    {
        id: 'ocean',
        name: 'Ocean',
        boardLight: '#dee3e6',
        boardDark: '#8ca2ad',
        highlightFrom: 'rgba(0, 150, 255, 0.3)',
        highlightTo: 'rgba(0, 150, 255, 0.4)',
        selected: 'rgba(0, 150, 255, 0.5)',
        legalDot: 'rgba(0, 100, 200, 0.25)',
        legalCapture: 'rgba(0, 100, 200, 0.3)',
        primary: '#2196f3',
        secondary: '#4fc3f7',
        bgDefault: '#0a1420',
        bgPaper: '#101e2e',
        bgSidebar: '#0b1622',
        accent: '#2196f3',
    },
    {
        id: 'coral',
        name: 'Coral',
        boardLight: '#f5e6ca',
        boardDark: '#c47c5a',
        highlightFrom: 'rgba(255, 100, 50, 0.25)',
        highlightTo: 'rgba(255, 100, 50, 0.35)',
        selected: 'rgba(255, 100, 50, 0.5)',
        legalDot: 'rgba(200, 80, 40, 0.25)',
        legalCapture: 'rgba(200, 80, 40, 0.3)',
        primary: '#e8734a',
        secondary: '#ff9a76',
        bgDefault: '#1a100c',
        bgPaper: '#241814',
        bgSidebar: '#1a100c',
        accent: '#e8734a',
    },
    {
        id: 'slate',
        name: 'Slate',
        boardLight: '#cdd0d4',
        boardDark: '#6e7a8a',
        highlightFrom: 'rgba(100, 200, 255, 0.3)',
        highlightTo: 'rgba(100, 200, 255, 0.4)',
        selected: 'rgba(100, 200, 255, 0.5)',
        legalDot: 'rgba(80, 160, 220, 0.25)',
        legalCapture: 'rgba(80, 160, 220, 0.3)',
        primary: '#78909c',
        secondary: '#b0bec5',
        bgDefault: '#12161a',
        bgPaper: '#1a2028',
        bgSidebar: '#12161a',
        accent: '#78909c',
    },
];
interface ThemeContextType {
    appTheme: AppTheme;
    setThemeById: (id: string) => void;
    muiTheme: Theme;
    themes: AppTheme[];
}
const ThemeContext = createContext<ThemeContextType>(null!);
export function useAppTheme() {
    return useContext(ThemeContext);
}
function buildMuiTheme(t: AppTheme): Theme {
    return createTheme({
        palette: {
            mode: 'dark',
            primary: { main: t.primary },
            secondary: { main: t.secondary },
            background: {
                default: t.bgDefault,
                paper: t.bgPaper,
            },
            text: {
                primary: '#f0e8e0',
                secondary: alpha('#f0e8e0', 0.65),
            },
            divider: alpha('#ffffff', 0.08),
        },
        typography: {
            fontFamily: '"Inter", "Nunito", "Roboto", sans-serif',
            button: { textTransform: 'none', fontWeight: 600 },
            h4: { fontWeight: 700, letterSpacing: '-0.02em' },
            h5: { fontWeight: 700, letterSpacing: '-0.01em' },
            h6: { fontWeight: 600 },
        },
        shape: { borderRadius: 14 },
        components: {
            MuiCssBaseline: {
                styleOverrides: {
                    '@import': "url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap')",
                    ':root': {
                        '--app-selection': alpha(t.primary, 0.35),
                        '--app-scrollbar': alpha(t.primary, 0.28),
                        '--app-scrollbar-hover': alpha(t.primary, 0.44),
                    },
                    body: {
                        backgroundColor: t.bgDefault,
                        backgroundImage: `
                            radial-gradient(ellipse at 10% 5%, ${alpha(t.secondary, 0.10)} 0%, transparent 42%),
                            radial-gradient(ellipse at 88% 12%, ${alpha(t.primary, 0.13)} 0%, transparent 46%)
                        `,
                        color: '#f0e8e0',
                    },
                    '#root': { minHeight: '100vh' },
                    '::selection': { backgroundColor: 'var(--app-selection)', color: '#fff' },
                    '::-webkit-scrollbar': { width: 6, height: 6 },
                    '::-webkit-scrollbar-track': { background: 'transparent' },
                    '::-webkit-scrollbar-thumb': {
                        backgroundColor: 'var(--app-scrollbar)',
                        borderRadius: 99,
                    },
                    '::-webkit-scrollbar-thumb:hover': {
                        backgroundColor: 'var(--app-scrollbar-hover)',
                    },
                },
            },
            MuiButton: {
                styleOverrides: {
                    root: {
                        textTransform: 'none',
                        fontWeight: 600,
                        fontSize: '0.85rem',
                        borderRadius: 12,
                        transition: 'background-color 0.18s ease, border-color 0.18s ease, color 0.18s ease, box-shadow 0.18s ease',
                    },
                    contained: {
                        boxShadow: 'none',
                        '&:hover': {
                            backgroundColor: alpha(t.primary, 0.82),
                            boxShadow: 'none',
                        },
                    },
                },
            },
            MuiPaper: {
                styleOverrides: {
                    root: {
                        backgroundImage: 'none',
                        border: `1px solid ${alpha('#ffffff', 0.07)}`,
                    },
                },
            },
            MuiCard: {
                styleOverrides: {
                    root: {
                        backgroundImage: 'none',
                        border: `1px solid ${alpha('#ffffff', 0.07)}`,
                        borderRadius: 16,
                        transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                        '&:hover': {
                            borderColor: alpha(t.primary, 0.32),
                            boxShadow: `0 4px 24px ${alpha(t.primary, 0.10)}`,
                        },
                    },
                },
            },
            MuiChip: {
                styleOverrides: {
                    root: { borderRadius: 8, fontWeight: 600, fontSize: '0.72rem' },
                },
            },
            MuiDialog: {
                styleOverrides: {
                    paper: {
                        backgroundImage: 'none',
                        borderRadius: 20,
                        border: `1px solid ${alpha(t.primary, 0.18)}`,
                        boxShadow: `0 24px 60px ${alpha('#000', 0.5)}`,
                    },
                },
            },
            MuiDrawer: {
                styleOverrides: {
                    paper: {
                        backgroundColor: t.bgSidebar,
                        borderRight: `1px solid ${alpha(t.primary, 0.18)}`,
                        backgroundImage: 'none',
                    },
                },
            },
            MuiAppBar: {
                styleOverrides: {
                    root: {
                        backgroundColor: alpha(t.bgPaper, 0.88),
                        borderBottom: `1px solid ${alpha(t.primary, 0.18)}`,
                        backdropFilter: 'blur(12px)',
                        backgroundImage: 'none',
                        boxShadow: 'none',
                    },
                },
            },
            MuiTextField: {
                styleOverrides: {
                    root: {
                        '& .MuiOutlinedInput-root': {
                            borderRadius: 12,
                            transition: 'box-shadow 0.18s',
                            '&.Mui-focused': {
                                boxShadow: `0 0 0 3px ${alpha(t.primary, 0.20)}`,
                            },
                        },
                    },
                },
            },
            MuiListItemButton: {
                styleOverrides: {
                    root: {
                        borderRadius: 10,
                        margin: '1px 6px',
                        transition: 'background-color 0.15s ease',
                        '&.Mui-selected': {
                            backgroundColor: alpha(t.primary, 0.20),
                            '&:hover': { backgroundColor: alpha(t.primary, 0.28) },
                        },
                        '&:hover': {
                            backgroundColor: alpha('#000000', 0.16),
                        },
                    },
                },
            },
            MuiSlider: {
                styleOverrides: {
                    thumb: {
                        width: 14,
                        height: 14,
                        transition: 'box-shadow 0.18s',
                        '&:hover, &.Mui-active': {
                            boxShadow: `0 0 0 10px ${alpha(t.primary, 0.18)}`,
                        },
                    },
                    track: { borderRadius: 4 },
                    rail: { borderRadius: 4, opacity: 0.3 },
                },
            },
            MuiSwitch: {
                styleOverrides: {
                    root: { padding: 6 },
                    thumb: { boxShadow: '0 2px 6px rgba(0,0,0,0.3)' },
                    track: { borderRadius: 8 },
                },
            },
            MuiTableCell: {
                styleOverrides: {
                    root: { borderBottom: `1px solid ${alpha('#ffffff', 0.07)}` },
                },
            },
            MuiDivider: {
                styleOverrides: {
                    root: { borderColor: alpha('#ffffff', 0.07) },
                },
            },
        },
    });
}
export function ThemeProvider({ children }: {
    children: ReactNode;
}) {
    const [themeId, setThemeId] = useState(() => {
        if (typeof window === 'undefined')
            return 'cappuccino';
        return window.localStorage.getItem(THEME_STORAGE_KEY) || 'cappuccino';
    });

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        let cancelled = false;
        const localThemeId = window.localStorage.getItem(THEME_STORAGE_KEY) || 'cappuccino';

        const loadDesktopTheme = async () => {
            const data = await initializeDesktopSettings({ themeId: localThemeId });
            if (cancelled) {
                return;
            }

            const nextThemeId = data?.themeId;
            if (nextThemeId && APP_THEMES.some((theme) => theme.id === nextThemeId)) {
                window.localStorage.setItem(THEME_STORAGE_KEY, nextThemeId);
                setThemeId(nextThemeId);
            }
        };

        void loadDesktopTheme();

        return () => {
            cancelled = true;
        };
    }, []);

    const appTheme = useMemo(() => APP_THEMES.find((t) => t.id === themeId) || APP_THEMES[0], [themeId]);
    const muiTheme = useMemo(() => buildMuiTheme(appTheme), [appTheme]);
    const setThemeById = useCallback((id: string) => {
        const exists = APP_THEMES.some((theme) => theme.id === id);
        if (!exists)
            return;
        setThemeId(id);
        if (typeof window !== 'undefined') {
            window.localStorage.setItem(THEME_STORAGE_KEY, id);
            void writeDesktopSettingsPatch({ themeId: id });
        }
    }, []);
    const ctx = useMemo(() => ({ appTheme, setThemeById, muiTheme, themes: APP_THEMES }), [appTheme, muiTheme, setThemeById]);
    return <ThemeContext.Provider value={ctx}>{children}</ThemeContext.Provider>;
}
