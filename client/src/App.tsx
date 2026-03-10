import { useState } from 'react';
import { ThemeProvider as MuiThemeProvider, CssBaseline } from '@mui/material';
import { ThemeProvider as AppThemeProvider, useAppTheme } from './context/ThemeContext';
import AppShell from './components/Layout/AppShell';
import PlayVsAI from './components/GameSetup/PlayVsAI';
import AIvsAI from './components/GameSetup/AIvsAI';
import EngineManagerPanel from './components/EngineManager/EngineManagerPanel';
function AppContent() {
    const { muiTheme } = useAppTheme();
    const [activeView, setActiveView] = useState('play');
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
    return (<MuiThemeProvider theme={muiTheme}>
      <CssBaseline />
      <AppShell activeView={activeView} onViewChange={setActiveView}>
        {renderView()}
      </AppShell>
    </MuiThemeProvider>);
}
function App() {
    return (<AppThemeProvider>
      <AppContent />
    </AppThemeProvider>);
}
export default App;
