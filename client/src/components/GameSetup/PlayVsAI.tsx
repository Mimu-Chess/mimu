import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Alert, Box, Button, Card, CardContent, Chip, Fade, FormControl, IconButton, InputLabel, MenuItem, Select, Slider, Snackbar, Tab, Tabs, ToggleButton, ToggleButtonGroup, Tooltip, Typography } from '@mui/material';
import { PlayArrow as PlayIcon, SportsEsports as GameIcon, Palette as ThemeIcon } from '@mui/icons-material';
import ChessboardPanel from '../Chessboard/ChessboardPanel';
import MoveList from '../MoveList/MoveList';
import EngineInfo from '../EngineInfo/EngineInfo';
import GameControls from '../GameControls/GameControls';
import GameHistoryPanel, { buildHistoryPlayback, type GameHistoryEntry } from '../GameHistory/GameHistoryPanel';
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

type SideTab = 'current' | 'history';

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
    const [sideTab, setSideTab] = useState<SideTab>('current');
    const [historyEntries, setHistoryEntries] = useState<GameHistoryEntry[]>([]);
    const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);
    const [selectedHistoryPlyIndex, setSelectedHistoryPlyIndex] = useState(0);
    const [snackbar, setSnackbar] = useState<{
        open: boolean;
        message: string;
        severity: 'success' | 'error' | 'info';
    }>({
        open: false, message: '', severity: 'info',
    });

    const isPlayingRef = useRef(false);
    const humanColorRef = useRef<'white' | 'black'>('white');
    const latestGameStateRef = useRef<GameState | null>(null);
    const currentGameConfigRef = useRef<{
        engineName: string;
        humanColor: 'white' | 'black';
    } | null>(null);
    const lastSavedPgnRef = useRef<string | null>(null);

    const loadHistory = useCallback(() => {
        emit('history:list', { mode: 'play' }, (response: { success: boolean; entries: GameHistoryEntry[] }) => {
            if (response?.success) {
                setHistoryEntries(response.entries || []);
            }
        });
    }, [emit]);

    useEffect(() => {
        emit('engine:list', (list: EngineConfig[]) => {
            setEngines(list);
            if (list.length > 0) {
                setSelectedEngine((current) => current || list[0].name);
            }
        });
        const cleanup = on('engine:list-update', (list: EngineConfig[]) => setEngines(list));
        return cleanup;
    }, [emit, on]);

    useEffect(() => {
        loadHistory();
    }, [loadHistory]);

    useEffect(() => {
        const handleHistorySaved = (entry: GameHistoryEntry) => {
            if (entry.mode !== 'play') {
                return;
            }

            setHistoryEntries((prev) => [entry, ...prev.filter((item) => item.id !== entry.id)]);
            setSelectedHistoryId(entry.id);
            setSelectedHistoryPlyIndex(entry.moves.length);
        };

        const handleHistoryCleared = (payload: { mode?: 'play' | 'match' | null }) => {
            if (payload?.mode && payload.mode !== 'play') {
                return;
            }

            setHistoryEntries([]);
            setSelectedHistoryId(null);
            setSelectedHistoryPlyIndex(0);
        };

        on('history:saved', handleHistorySaved);
        on('history:cleared', handleHistoryCleared);

        return () => {
            off('history:saved', handleHistorySaved);
            off('history:cleared', handleHistoryCleared);
        };
    }, [on, off]);

    useEffect(() => {
        const stateHandler = (state: GameState) => {
            latestGameStateRef.current = state;
            setGameState(state);
            if (isPlayingRef.current) {
                const isEngineTurn = (state.turn === 'w' && humanColorRef.current === 'black')
                    || (state.turn === 'b' && humanColorRef.current === 'white');
                setIsThinking(isEngineTurn && !state.isGameOver);
            }
        };

        const infoHandler = (info: any) => setEngineInfo(info);

        const gameOverHandler = (state: GameState) => {
            latestGameStateRef.current = state;
            setGameState(state);
            setIsPlaying(false);
            isPlayingRef.current = false;
            setIsThinking(false);

            let message = 'Game over!';
            if (state.result === '1-0') {
                message = 'White wins!';
            }
            else if (state.result === '0-1') {
                message = 'Black wins!';
            }
            else if (state.result === '1/2-1/2') {
                message = 'Draw!';
            }

            setSnackbar({ open: true, message, severity: 'info' });
        };

        const pgnHandler = (pgnData: string) => {
            setPgn(pgnData);

            if (lastSavedPgnRef.current === pgnData) {
                return;
            }

            lastSavedPgnRef.current = pgnData;
        };

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
        if (!selectedEngine) {
            return;
        }

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
                currentGameConfigRef.current = {
                    engineName: selectedEngine,
                    humanColor,
                };
                lastSavedPgnRef.current = null;
                setOrientation(humanColor);
                setGameState(response.state);
                latestGameStateRef.current = response.state;
                setPgn(null);
                setEngineInfo(null);
                setSideTab('current');
                if (humanColor === 'black') {
                    setIsThinking(true);
                }
            }
            else {
                setSnackbar({ open: true, message: response.error || 'Failed to start game', severity: 'error' });
            }
        });
    };

    const handleMove = useCallback((from: string, to: string, promotion?: string): boolean => {
        if (!isPlayingRef.current) {
            return false;
        }
        emit('game:move', { from, to, promotion }, () => { });
        return true;
    }, [emit]);

    const handleResign = () => {
        emit('game:resign', { color: humanColor }, () => { });
    };

    const handleUndo = () => {
        emit('game:undo', (response: any) => {
            if (response.success) {
                setIsThinking(false);
            }
        });
    };

    const handleFlip = () => setOrientation((value) => (value === 'white' ? 'black' : 'white'));

    const handleNewGame = () => {
        if (isPlaying) {
            emit('game:stop', () => { });
        }
        setIsPlaying(false);
        isPlayingRef.current = false;
        setGameState(null);
        latestGameStateRef.current = null;
        currentGameConfigRef.current = null;
        setEngineInfo(null);
        setIsThinking(false);
        setPgn(null);
        setSideTab('current');
    };

    const handleClearHistory = useCallback(() => {
        emit('history:clear', { mode: 'play' }, () => { });
    }, [emit]);

    useEffect(() => {
        if (historyEntries.length === 0) {
            setSelectedHistoryId(null);
            setSelectedHistoryPlyIndex(0);
            return;
        }

        if (!selectedHistoryId || !historyEntries.some((entry) => entry.id === selectedHistoryId)) {
            setSelectedHistoryId(historyEntries[0].id);
            setSelectedHistoryPlyIndex(historyEntries[0].moves.length);
        }
    }, [historyEntries, selectedHistoryId]);

    const handleDownloadPGN = () => {
        if (!pgn) {
            return;
        }
        const blob = new Blob([pgn], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = 'game.pgn';
        anchor.click();
        URL.revokeObjectURL(url);
    };

    const handleDownloadHistoryPGN = (entry: GameHistoryEntry) => {
        if (!entry.pgn) {
            return;
        }
        const blob = new Blob([entry.pgn], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `${entry.white}_vs_${entry.black}.pgn`.replace(/\s+/g, '_');
        anchor.click();
        URL.revokeObjectURL(url);
    };

    const isHumanTurn = gameState
        ? (gameState.turn === 'w' && humanColor === 'white') || (gameState.turn === 'b' && humanColor === 'black')
        : false;

    const selectedEngineConfig = engines.find((engine) => engine.name === selectedEngine);
    const isWeightsBased = selectedEngineConfig?.hasWeightsFile ?? false;

    const selectedHistoryEntry = useMemo(
        () => historyEntries.find((entry) => entry.id === selectedHistoryId) ?? historyEntries[0] ?? null,
        [historyEntries, selectedHistoryId],
    );

    const historyPlayback = useMemo(
        () => (selectedHistoryEntry ? buildHistoryPlayback(selectedHistoryEntry.moves) : [{ fen: 'start', lastMove: null }]),
        [selectedHistoryEntry],
    );

    const historySnapshotIndex = Math.min(Math.max(selectedHistoryPlyIndex, 0), historyPlayback.length - 1);
    const historySnapshot = historyPlayback[historySnapshotIndex];
    const showingHistory = sideTab === 'history' && !!selectedHistoryEntry;

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

    const renderSetupCard = () => (
        <Fade in>
            <Card
                data-tour="play-setup-card"
                sx={{
                    width: 'min(100%, 533px)',
                    bgcolor: 'background.paper',
                }}
            >
                <CardContent sx={{ p: 2.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                        <GameIcon sx={{ color: 'primary.main', fontSize: 20 }} />
                        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Game Setup</Typography>
                    </Box>

                    <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                        <InputLabel>Engine</InputLabel>
                        <Select value={selectedEngine} label="Engine" onChange={(event) => setSelectedEngine(event.target.value)}>
                            {engines.map((engine) => (
                                <MenuItem key={engine.name} value={engine.name}>{engine.name}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    <Typography variant="caption" sx={{ mb: 0.5, color: 'text.secondary', display: 'block' }}>Play as</Typography>
                    <ToggleButtonGroup value={humanColor} exclusive onChange={(_, value) => value && setHumanColor(value)} fullWidth size="small" sx={{ mb: 2 }}>
                        <ToggleButton value="white" sx={{ textTransform: 'none', fontSize: '0.8rem' }}>White</ToggleButton>
                        <ToggleButton value="black" sx={{ textTransform: 'none', fontSize: '0.8rem' }}>Black</ToggleButton>
                    </ToggleButtonGroup>

                    <Typography variant="caption" sx={{ mb: 0.5, color: 'text.secondary', display: 'block' }}>
                        Think time: {(moveTime / 1000).toFixed(1)}s
                    </Typography>
                    {isWeightsBased ? (
                        <Box sx={{ p: 1, mb: 2, borderRadius: 1, bgcolor: 'action.hover', border: '1px solid', borderColor: 'divider' }}>
                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                This engine uses nodes = {selectedEngineConfig?.nodes ?? 1} per move.
                            </Typography>
                        </Box>
                    ) : (
                        <Slider value={moveTime} onChange={(_, value) => setMoveTime(value as number)} min={500} max={10000} step={500} valueLabelDisplay="auto" valueLabelFormat={(value) => `${(value / 1000).toFixed(1)}s`} size="small" sx={{ mb: 2 }} />
                    )}

                    <Button variant="contained" fullWidth startIcon={<PlayIcon />} onClick={handleStartGame} disabled={!selectedEngine || engines.length === 0}>
                        Start Game
                    </Button>

                    {engines.length === 0 && (
                        <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', mt: 1.5, color: 'warning.main' }}>
                            No engines configured. Go to Engines to add one.
                        </Typography>
                    )}
                </CardContent>
            </Card>
        </Fade>
    );

    const renderCurrentPanel = () => {
        if (!isPlaying && !gameState) {
            return (
                <Box sx={{ minHeight: 420, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {renderSetupCard()}
                </Box>
            );
        }

        return (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <EngineInfo info={engineInfo} engineName={selectedEngine} isThinking={isThinking} />
                <Box sx={{ minHeight: 220 }}>
                    <MoveList
                        moves={gameState?.movesSan || []}
                        currentMoveIndex={gameState ? gameState.movesSan.length - 1 : undefined}
                    />
                </Box>
            </Box>
        );
    };

    return (
        <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>Play vs AI</Typography>
            </Box>
            <Typography variant="caption" sx={{ color: 'text.secondary', mb: 2, display: 'block' }}>
                Challenge a chess engine
            </Typography>

            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                <Box sx={{ flex: '0 0 auto' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5, gap: 1 }}>
                        <Chip
                            label={
                                showingHistory
                                    ? 'History replay'
                                    : gameState?.isGameOver
                                        ? 'Game finished'
                                        : gameState
                                            ? (isHumanTurn ? 'Your turn' : 'Engine thinking...')
                                            : 'Ready to start'
                            }
                            color={showingHistory || isHumanTurn ? 'primary' : 'default'}
                            size="small"
                            variant={showingHistory || isHumanTurn ? 'filled' : 'outlined'}
                            sx={{ height: 24, fontSize: '0.7rem' }}
                        />
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            {showingHistory && selectedHistoryEntry?.result && (
                                <Chip label={selectedHistoryEntry.result} color="secondary" size="small" sx={{ height: 24, fontSize: '0.7rem' }} />
                            )}
                            {!showingHistory && gameState?.result && (
                                <Chip label={gameState.result} color="secondary" size="small" sx={{ height: 24, fontSize: '0.7rem' }} />
                            )}
                            <Tooltip title="Theme">
                                <IconButton size="small" onClick={() => setShowThemes((value) => !value)} sx={{ color: 'text.secondary' }}>
                                    <ThemeIcon fontSize="small" />
                                </IconButton>
                            </Tooltip>
                        </Box>
                    </Box>

                    {showThemes && (
                        <Box sx={{ display: 'flex', gap: 0.5, mb: 1, flexWrap: 'wrap' }}>
                            {themes.map((theme) => (
                                <Tooltip key={theme.id} title={theme.name}>
                                    <Box
                                        onClick={() => {
                                            setThemeById(theme.id);
                                            setShowThemes(false);
                                        }}
                                        sx={{
                                            width: 28,
                                            height: 28,
                                            borderRadius: 0.75,
                                            cursor: 'pointer',
                                            overflow: 'hidden',
                                            border: appTheme.id === theme.id ? '2px solid' : '2px solid transparent',
                                            borderColor: appTheme.id === theme.id ? 'primary.main' : 'transparent',
                                            display: 'flex',
                                            transition: 'border-color 0.15s',
                                            '&:hover': { borderColor: 'primary.light' },
                                        }}
                                    >
                                        <Box sx={{ width: '50%', height: '100%', bgcolor: theme.boardLight }} />
                                        <Box sx={{ width: '50%', height: '100%', bgcolor: theme.boardDark }} />
                                    </Box>
                                </Tooltip>
                            ))}
                        </Box>
                    )}

                    <ChessboardPanel
                        fen={showingHistory ? historySnapshot.fen : (gameState?.fen || 'start')}
                        onMove={handleMove}
                        orientation={orientation}
                        interactive={isPlaying && isHumanTurn && !showingHistory}
                        lastMove={showingHistory ? historySnapshot.lastMove : (gameState?.lastMove || null)}
                        boardTheme={boardTheme}
                    />

                    {showingHistory ? (
                        <Typography variant="caption" sx={{ mt: 1.25, display: 'block', color: 'text.secondary', textAlign: 'center' }}>
                            Viewing a saved game. Switch back to Current Game to resume live play controls.
                        </Typography>
                    ) : gameState ? (
                        <GameControls
                            onNewGame={handleNewGame}
                            onResign={handleResign}
                            onUndo={handleUndo}
                            onFlip={handleFlip}
                            onDownloadPGN={handleDownloadPGN}
                            isGameActive={isPlaying}
                            canUndo={isPlaying && (gameState?.movesSan?.length || 0) >= 2}
                            hasPGN={!!pgn}
                        />
                    ) : (
                        <Typography variant="caption" sx={{ mt: 1.25, display: 'block', color: 'text.secondary', textAlign: 'center' }}>
                        </Typography>
                    )}
                </Box>

                <Box sx={{ flex: 1, minWidth: 280, display: 'flex', flexDirection: 'column', gap: 1.5, maxWidth: 520 }}>
                    <Card sx={{ bgcolor: 'background.paper' }}>
                        <Tabs
                            value={sideTab}
                            onChange={(_, value: SideTab) => setSideTab(value)}
                            variant="fullWidth"
                            sx={{ borderBottom: '1px solid', borderColor: 'divider' }}
                        >
                            <Tab value="current" label="Current Game" />
                            <Tab value="history" label={`Game History (${historyEntries.length})`} />
                        </Tabs>
                        <Box sx={{ p: 1.5 }}>
                            {sideTab === 'current' ? renderCurrentPanel() : (
                                <GameHistoryPanel
                                    entries={historyEntries}
                                    selectedEntryId={selectedHistoryEntry?.id || null}
                                    onSelectEntry={(entryId) => {
                                        setSelectedHistoryId(entryId);
                                        const entry = historyEntries.find((item) => item.id === entryId);
                                        setSelectedHistoryPlyIndex(entry?.moves.length ?? 0);
                                    }}
                                    selectedPlyIndex={historySnapshotIndex}
                                    onSelectPlyIndex={setSelectedHistoryPlyIndex}
                                    onDownloadPGN={handleDownloadHistoryPGN}
                                    onClearHistory={handleClearHistory}
                                    emptyMessage="Finish a game to add it to history."
                                />
                            )}
                        </Box>
                    </Card>
                </Box>
            </Box>

            <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar((state) => ({ ...state, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
                <Alert onClose={() => setSnackbar((state) => ({ ...state, open: false }))} severity={snackbar.severity} variant="filled">
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
}
