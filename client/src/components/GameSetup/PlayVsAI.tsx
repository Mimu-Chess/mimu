import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Box, Typography, Card, CardContent, Button, FormControl, InputLabel, Select, MenuItem, Slider, ToggleButton, ToggleButtonGroup, Chip, Snackbar, Alert, Fade, IconButton, Tooltip, } from '@mui/material';
import { PlayArrow as PlayIcon, SportsEsports as GameIcon, Palette as ThemeIcon, } from '@mui/icons-material';
import ChessboardPanel from '../Chessboard/ChessboardPanel';
import MoveList from '../MoveList/MoveList';
import EngineInfo from '../EngineInfo/EngineInfo';
import GameControls from '../GameControls/GameControls';
import { useSocket } from '../../hooks/useSocket';
import { useAppTheme } from '../../context/ThemeContext';
interface EngineConfig {
    name: string;
    path: string;
    type: string;
    hasWeightsFile?: boolean;
    nodes?: number;
    weightsFile?: string;
}
interface GameState {
    fen: string;
    moves: string[];
    movesSan: string[];
    result: string | null;
    turn: 'w' | 'b';
    isCheck: boolean;
    isCheckmate: boolean;
    isDraw: boolean;
    isGameOver: boolean;
    lastMove?: {
        from: string;
        to: string;
    };
}
export default function PlayVsAI() {
    const { emit, on, off } = useSocket();
    const { appTheme, themes, setThemeById } = useAppTheme();
    const [engines, setEngines] = useState<EngineConfig[]>([]);
    const [selectedEngine, setSelectedEngine] = useState('');
    const [humanColor, setHumanColor] = useState<'white' | 'black'>('white');
    const [moveTime, setMoveTime] = useState(1000);
    const [isPlaying, setIsPlaying] = useState(false);
    const [gameState, setGameState] = useState<GameState | null>(null);
    const [engineInfo, setEngineInfo] = useState<any>(null);
    const [isThinking, setIsThinking] = useState(false);
    const [orientation, setOrientation] = useState<'white' | 'black'>('white');
    const [pgn, setPgn] = useState<string | null>(null);
    const [showThemes, setShowThemes] = useState(false);
    const [snackbar, setSnackbar] = useState<{
        open: boolean;
        message: string;
        severity: 'success' | 'error' | 'info';
    }>({
        open: false, message: '', severity: 'info',
    });
    const isPlayingRef = useRef(false);
    const humanColorRef = useRef<'white' | 'black'>('white');
    useEffect(() => {
        emit('engine:list', (list: EngineConfig[]) => {
            setEngines(list);
            if (list.length > 0 && !selectedEngine) {
                setSelectedEngine(list[0].name);
            }
        });
        const cleanup = on('engine:list-update', (list: EngineConfig[]) => setEngines(list));
        return cleanup;
    }, [emit, on]);
    useEffect(() => {
        const stateHandler = (state: GameState) => {
            setGameState(state);
            if (isPlayingRef.current) {
                const isEngineTurn = (state.turn === 'w' && humanColorRef.current === 'black') ||
                    (state.turn === 'b' && humanColorRef.current === 'white');
                setIsThinking(isEngineTurn && !state.isGameOver);
            }
        };
        const infoHandler = (info: any) => setEngineInfo(info);
        const gameOverHandler = (state: GameState) => {
            setIsPlaying(false);
            isPlayingRef.current = false;
            setIsThinking(false);
            let message = 'Game over!';
            if (state.result === '1-0')
                message = 'White wins!';
            else if (state.result === '0-1')
                message = 'Black wins!';
            else if (state.result === '1/2-1/2')
                message = 'Draw!';
            setSnackbar({ open: true, message, severity: 'info' });
        };
        const pgnHandler = (pgnData: string) => setPgn(pgnData);
        on('game:state', stateHandler);
        on('game:engine-info', infoHandler);
        on('game:over', gameOverHandler);
        on('game:pgn', pgnHandler);
        return () => {
            off('game:state', stateHandler);
            off('game:engine-info', infoHandler);
            off('game:over', gameOverHandler);
            off('game:pgn', pgnHandler);
        };
    }, [on, off]);
    const handleStartGame = () => {
        if (!selectedEngine)
            return;
        emit('game:start', {
            mode: 'human-vs-ai',
            humanColor,
            whiteEngine: humanColor === 'black' ? selectedEngine : undefined,
            blackEngine: humanColor === 'white' ? selectedEngine : undefined,
            movetime: moveTime,
        }, (response: any) => {
            if (response.success) {
                setIsPlaying(true);
                isPlayingRef.current = true;
                humanColorRef.current = humanColor;
                setOrientation(humanColor);
                setGameState(response.state);
                setPgn(null);
                setEngineInfo(null);
                if (humanColor === 'black')
                    setIsThinking(true);
            }
            else {
                setSnackbar({ open: true, message: response.error || 'Failed to start game', severity: 'error' });
            }
        });
    };
    const handleMove = useCallback((from: string, to: string, promotion?: string): boolean => {
        if (!isPlayingRef.current)
            return false;
        emit('game:move', { from, to, promotion }, () => { });
        return true;
    }, [emit]);
    const handleResign = () => {
        emit('game:resign', { color: humanColor }, () => { });
    };
    const handleUndo = () => {
        emit('game:undo', (response: any) => {
            if (response.success)
                setIsThinking(false);
        });
    };
    const handleFlip = () => setOrientation((o) => (o === 'white' ? 'black' : 'white'));
    const handleNewGame = () => {
        if (isPlaying)
            emit('game:stop', () => { });
        setIsPlaying(false);
        isPlayingRef.current = false;
        setGameState(null);
        setEngineInfo(null);
        setIsThinking(false);
        setPgn(null);
    };
    const handleDownloadPGN = () => {
        if (!pgn)
            return;
        const blob = new Blob([pgn], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'game.pgn';
        a.click();
        URL.revokeObjectURL(url);
    };
    const isHumanTurn = gameState
        ? (gameState.turn === 'w' && humanColor === 'white') || (gameState.turn === 'b' && humanColor === 'black')
        : false;
    const selectedEngineConfig = engines.find((e) => e.name === selectedEngine);
    const isWeightsBased = selectedEngineConfig?.hasWeightsFile ?? false;
    const boardTheme = useMemo(() => ({
        name: appTheme.name,
        light: appTheme.boardLight,
        dark: appTheme.boardDark,
        highlightFrom: appTheme.highlightFrom,
        highlightTo: appTheme.highlightTo,
        selected: appTheme.selected,
        legalDot: appTheme.legalDot,
        legalCapture: appTheme.legalCapture,
    }), [appTheme]);
    return (<Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>Play vs AI</Typography>
            </Box>
            <Typography variant="caption" sx={{ color: 'text.secondary', mb: 2, display: 'block' }}>
                Challenge a chess engine
            </Typography>

            {!isPlaying && !gameState ? (<Fade in>
                    <Card data-tour="play-setup-card" sx={{ maxWidth: 400, bgcolor: 'background.paper' }}>
                        <CardContent sx={{ p: 2.5 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                                <GameIcon sx={{ color: 'primary.main', fontSize: 20 }}/>
                                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Game Setup</Typography>
                            </Box>

                            <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                                <InputLabel>Engine</InputLabel>
                                <Select value={selectedEngine} label="Engine" onChange={(e) => setSelectedEngine(e.target.value)}>
                                    {engines.map((eng) => (<MenuItem key={eng.name} value={eng.name}>{eng.name}</MenuItem>))}
                                </Select>
                            </FormControl>

                            <Typography variant="caption" sx={{ mb: 0.5, color: 'text.secondary', display: 'block' }}>Play as</Typography>
                            <ToggleButtonGroup value={humanColor} exclusive onChange={(_, val) => val && setHumanColor(val)} fullWidth size="small" sx={{ mb: 2 }}>
                                <ToggleButton value="white" sx={{ textTransform: 'none', fontSize: '0.8rem' }}>White</ToggleButton>
                                <ToggleButton value="black" sx={{ textTransform: 'none', fontSize: '0.8rem' }}>Black</ToggleButton>
                            </ToggleButtonGroup>

                            <Typography variant="caption" sx={{ mb: 0.5, color: 'text.secondary', display: 'block' }}>
                                Think time: {(moveTime / 1000).toFixed(1)}s
                            </Typography>
                            {isWeightsBased ? (<Box sx={{
                    p: 1, mb: 2, borderRadius: 1,
                    bgcolor: 'action.hover',
                    border: '1px solid',
                    borderColor: 'divider',
                }}>
                                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                        🎯 This engine plays with{' '}
                                        <strong>nodes = {selectedEngineConfig?.nodes ?? 1}</strong>{' '}
                                        per move. Search depth is fixed by the node limit.
                                    </Typography>
                                </Box>) : (<Slider value={moveTime} onChange={(_, val) => setMoveTime(val as number)} min={500} max={10000} step={500} valueLabelDisplay="auto" valueLabelFormat={(v) => `${(v / 1000).toFixed(1)}s`} size="small" sx={{ mb: 2 }}/>)}

                            <Button variant="contained" fullWidth startIcon={<PlayIcon />} onClick={handleStartGame} disabled={!selectedEngine || engines.length === 0}>
                                Start Game
                            </Button>

                            {engines.length === 0 && (<Typography variant="caption" sx={{ display: 'block', textAlign: 'center', mt: 1.5, color: 'warning.main' }}>
                                    No engines configured. Go to Engines to add one.
                                </Typography>)}
                        </CardContent>
                    </Card>
                </Fade>) : (<Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                    
                    <Box sx={{ flex: '0 0 auto' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                            <Chip label={isHumanTurn ? 'Your turn' : 'Engine thinking...'} color={isHumanTurn ? 'primary' : 'default'} size="small" variant={isHumanTurn ? 'filled' : 'outlined'} sx={{ height: 24, fontSize: '0.7rem' }}/>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                {gameState?.result && (<Chip label={gameState.result} color="secondary" size="small" sx={{ height: 24, fontSize: '0.7rem' }}/>)}
                                <Tooltip title="Theme">
                                    <IconButton size="small" onClick={() => setShowThemes(!showThemes)} sx={{ color: 'text.secondary' }}>
                                        <ThemeIcon fontSize="small"/>
                                    </IconButton>
                                </Tooltip>
                            </Box>
                        </Box>

                        
                        {showThemes && (<Box sx={{ display: 'flex', gap: 0.5, mb: 1, flexWrap: 'wrap' }}>
                                {themes.map((t) => (<Tooltip key={t.id} title={t.name}>
                                        <Box onClick={() => { setThemeById(t.id); setShowThemes(false); }} sx={{
                        width: 28,
                        height: 28,
                        borderRadius: 0.75,
                        cursor: 'pointer',
                        overflow: 'hidden',
                        border: appTheme.id === t.id ? '2px solid' : '2px solid transparent',
                        borderColor: appTheme.id === t.id ? 'primary.main' : 'transparent',
                        display: 'flex',
                        transition: 'border-color 0.15s',
                        '&:hover': { borderColor: 'primary.light' },
                    }}>
                                            <Box sx={{ width: '50%', height: '100%', bgcolor: t.boardLight }}/>
                                            <Box sx={{ width: '50%', height: '100%', bgcolor: t.boardDark }}/>
                                        </Box>
                                    </Tooltip>))}
                            </Box>)}

                        <ChessboardPanel fen={gameState?.fen || 'start'} onMove={handleMove} orientation={orientation} interactive={isPlaying && isHumanTurn} lastMove={gameState?.lastMove || null} boardTheme={boardTheme}/>
                        <GameControls onNewGame={handleNewGame} onResign={handleResign} onUndo={handleUndo} onFlip={handleFlip} onDownloadPGN={handleDownloadPGN} isGameActive={isPlaying} canUndo={isPlaying && (gameState?.movesSan?.length || 0) >= 2} hasPGN={!!pgn}/>
                    </Box>

                    
                    <Box sx={{ flex: 1, minWidth: 200, display: 'flex', flexDirection: 'column', gap: 1.5, maxWidth: 300 }}>
                        <EngineInfo info={engineInfo} engineName={selectedEngine} isThinking={isThinking}/>
                        <Box sx={{ flex: 1, minHeight: 180 }}>
                            <MoveList moves={gameState?.movesSan || []} currentMoveIndex={gameState ? (gameState.movesSan.length - 1) : undefined}/>
                        </Box>
                    </Box>
                </Box>)}

            <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar((s) => ({ ...s, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
                <Alert onClose={() => setSnackbar((s) => ({ ...s, open: false }))} severity={snackbar.severity} variant="filled">
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>);
}
