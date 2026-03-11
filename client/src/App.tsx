import { useState, useEffect } from 'react';
import { ThemeProvider as MuiThemeProvider, CssBaseline } from '@mui/material';
import { ThemeProvider as AppThemeProvider, useAppTheme } from './context/ThemeContext';
import AppShell from './components/Layout/AppShell';
import PlayVsAI from './components/GameSetup/PlayVsAI';
import AIvsAI from './components/GameSetup/AIvsAI';
import EngineManagerPanel from './components/EngineManager/EngineManagerPanel';
import { DesktopSplash } from './components/DesktopSplash/DesktopSplash';

function AppContent() {
    const { muiTheme } = useAppTheme();
    const [activeView, setActiveView] = useState('play');
    const [isAppReady, setIsAppReady] = useState(false);

    useEffect(() => {
        // Initialize Neutralino if available
        if (typeof (window as any).Neutralino !== 'undefined') {
            (window as any).Neutralino.init();
        }

        // Hold the splash screen until the desktop shell is ready to mount.
        const timeoutId = setTimeout(() => {
            setIsAppReady(true);
        }, 3000);

        return () => {
            clearTimeout(timeoutId);
        };
    }, []);

    const renderView = () => {
        switch (activeView) {
            case 'play':
                return <PlayVsAI />;
            case 'match':
                return <AIvsAI />;
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
                <AppShell activeView={activeView} onViewChange={setActiveView}>
                    {renderView()}
                </AppShell>
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
