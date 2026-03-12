import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Alert, Box, Button, Card, CardContent, Chip, Divider, Fade, FormControl, InputLabel, MenuItem, Select, Slider, Snackbar, Tab, Tabs, TextField, Typography } from '@mui/material';
import { PlayArrow as PlayIcon, Stop as StopIcon, SmartToy as MatchIcon } from '@mui/icons-material';
import ChessboardPanel from '../Chessboard/ChessboardPanel';
import MoveList from '../MoveList/MoveList';
import EngineInfo from '../EngineInfo/EngineInfo';
import MatchResults from '../MatchResults/MatchResults';
import GameHistoryPanel, { buildHistoryPlayback, type GameHistoryEntry } from '../GameHistory/GameHistoryPanel';
import { useSocket } from '../../hooks/useSocket';
import { useAppTheme } from '../../context/ThemeContext';
import { useAppSettings } from '../../context/SettingsContext';

interface EngineConfig {
    name: string;
    path: string;
    type: string;
    hasWeightsFile?: boolean;
    nodes?: number;
    weightsFile?: string;
}

interface MatchScore {
    white: {
        name: string;
        score: number;
    };
    black: {
        name: string;
        score: number;
    };
    draws: number;
    gamesPlayed: number;
    totalGames: number;
}

interface MatchResult {
    gameNumber: number;
    white: string;
    black: string;
    result: string;
    pgn: string;
    moves: string[];
}

type SideTab = 'current' | 'history';

export default function AIvsAI() {
    const { emit, on, off } = useSocket();
    const { appTheme } = useAppTheme();
    const { strings } = useAppSettings();
    const [engines, setEngines] = useState<EngineConfig[]>([]);
    const [whiteEngine, setWhiteEngine] = useState('');
    const [blackEngine, setBlackEngine] = useState('');
    const [numGames, setNumGames] = useState(4);
    const [moveTime, setMoveTime] = useState(1000);
    const [isRunning, setIsRunning] = useState(false);
    const [isStarting, setIsStarting] = useState(false);
    const [currentFen, setCurrentFen] = useState('start');
    const [currentMoves, setCurrentMoves] = useState<string[]>([]);
    const [lastMove, setLastMove] = useState<{
        from: string;
        to: string;
    } | null>(null);
    const [currentGame, setCurrentGame] = useState(0);
    const [score, setScore] = useState<MatchScore | null>(null);
    const [results, setResults] = useState<MatchResult[]>([]);
    const [historyEntries, setHistoryEntries] = useState<GameHistoryEntry[]>([]);
    const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);
    const [selectedHistoryPlyIndex, setSelectedHistoryPlyIndex] = useState(0);
    const [engineInfo, setEngineInfo] = useState<any>(null);
    const [currentWhite, setCurrentWhite] = useState('');
    const [currentBlack, setCurrentBlack] = useState('');
    const [sideTab, setSideTab] = useState<SideTab>('current');
    const [snackbar, setSnackbar] = useState<{
        open: boolean;
        message: string;
        severity: 'success' | 'error' | 'info';
    }>({
        open: false, message: '', severity: 'info',
    });

    const startAckTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        emit('engine:list', (list: EngineConfig[]) => {
            setEngines(list);
            if (list.length >= 2) {
                setWhiteEngine((current) => current || list[0].name);
                setBlackEngine((current) => current || list[1].name);
            }
            else if (list.length === 1) {
                setWhiteEngine((current) => current || list[0].name);
                setBlackEngine((current) => current || list[0].name);
            }
        });

        const cleanup = on('engine:list-update', (list: EngineConfig[]) => {
            setEngines(list);
        });

        return cleanup;
    }, [emit, on]);

    useEffect(() => {
        emit('history:list', { mode: 'match' }, (response: { success: boolean; entries: GameHistoryEntry[] }) => {
            if (response?.success) {
                setHistoryEntries(response.entries || []);
            }
        });
    }, [emit]);

    useEffect(() => {
        const handleHistorySaved = (entry: GameHistoryEntry) => {
            if (entry.mode !== 'match') {
                return;
            }

            setHistoryEntries((prev) => [entry, ...prev.filter((item) => item.id !== entry.id)]);
            setSelectedHistoryId(entry.id);
            setSelectedHistoryPlyIndex(entry.moves.length);
        };

        const handleHistoryCleared = (payload: { mode?: 'play' | 'match' | null }) => {
            if (payload?.mode && payload.mode !== 'match') {
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
        const gameStartHandler = (info: { gameNum: number; white: string; black: string }) => {
            setCurrentGame(info.gameNum);
            setCurrentFen('start');
            setCurrentMoves([]);
            setLastMove(null);
            setCurrentWhite(info.white);
            setCurrentBlack(info.black);
        };

        const gameStateHandler = (state: any) => {
            setCurrentFen(state.fen);
            setCurrentMoves(state.movesSan || []);
            if (state.lastMove) {
                setLastMove(state.lastMove);
            }
        };

        const engineInfoHandler = (data: any) => {
            setEngineInfo(data.info);
        };

        const matchUpdateHandler = (update: { result: MatchResult; score: MatchScore }) => {
            setResults((prev) => [...prev, update.result]);
            setScore(update.score);
        };

        const matchEndHandler = (data: { results: MatchResult[]; score: MatchScore }) => {
            setIsRunning(false);
            setResults(data.results);
            setScore(data.score);
            setSnackbar({ open: true, message: strings.match.matchCompleted, severity: 'success' });
        };

        const matchErrorHandler = (error: any) => {
            setSnackbar({ open: true, message: strings.match.errorInGame(error.gameNum, error.error), severity: 'error' });
        };

        on('match:game-start', gameStartHandler);
        on('match:game-state', gameStateHandler);
        on('match:engine-info', engineInfoHandler);
        on('match:update', matchUpdateHandler);
        on('match:end', matchEndHandler);
        on('match:error', matchErrorHandler);

        return () => {
            off('match:game-start', gameStartHandler);
            off('match:game-state', gameStateHandler);
            off('match:engine-info', engineInfoHandler);
            off('match:update', matchUpdateHandler);
            off('match:end', matchEndHandler);
            off('match:error', matchErrorHandler);
        };
    }, [on, off]);

    const handleClearHistory = useCallback(() => {
        emit('history:clear', { mode: 'match' }, () => { });
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

    useEffect(() => () => {
        if (startAckTimeoutRef.current) {
            clearTimeout(startAckTimeoutRef.current);
            startAckTimeoutRef.current = null;
        }
    }, []);

    const handleStartMatch = () => {
        if (!whiteEngine || !blackEngine) {
            return;
        }

        if (startAckTimeoutRef.current) {
            clearTimeout(startAckTimeoutRef.current);
            startAckTimeoutRef.current = null;
        }

        setIsStarting(true);
        setResults([]);
        setScore(null);
        setCurrentFen('start');
        setCurrentMoves([]);
        setLastMove(null);
        setCurrentGame(0);
        setEngineInfo(null);
        setCurrentWhite('');
        setCurrentBlack('');
        setSideTab('current');

        startAckTimeoutRef.current = setTimeout(() => {
            setIsStarting(false);
            setSnackbar({ open: true, message: strings.match.matchStartTimedOut, severity: 'error' });
        }, 8000);

        emit('match:start', {
            whiteEngine,
            blackEngine,
            games: numGames,
            movetime: moveTime,
        }, (response: any) => {
            if (startAckTimeoutRef.current) {
                clearTimeout(startAckTimeoutRef.current);
                startAckTimeoutRef.current = null;
            }

            setIsStarting(false);
            if (!response.success) {
                setSnackbar({ open: true, message: response.error || strings.match.failedToStartMatch, severity: 'error' });
                return;
            }

            setIsRunning(true);
        });
    };

    const handleStopMatch = () => {
        emit('match:stop', () => { });
        setIsRunning(false);
    };

    const handlePrepareNewMatch = () => {
        setResults([]);
        setScore(null);
        setCurrentFen('start');
        setCurrentMoves([]);
        setLastMove(null);
        setCurrentGame(0);
        setEngineInfo(null);
        setCurrentWhite('');
        setCurrentBlack('');
        setSideTab('current');
    };

    const handleDownloadPGN = (pgnContent: string, gameNum: number) => {
        const blob = new Blob([pgnContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `game_${gameNum}.pgn`;
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
        anchor.download = `${entry.title.replace(/\s+/g, '_')}.pgn`;
        anchor.click();
        URL.revokeObjectURL(url);
    };

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

    const whiteEngineCfg = engines.find((engine) => engine.name === whiteEngine);
    const blackEngineCfg = engines.find((engine) => engine.name === blackEngine);
    const anyWeightsBased = whiteEngineCfg?.hasWeightsFile || blackEngineCfg?.hasWeightsFile;
    const renderSetupCard = () => (
        <Fade in>
            <Card data-tour="match-setup-card" sx={{ bgcolor: 'background.paper' }}>
                <CardContent sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                        <MatchIcon sx={{ color: 'primary.main' }} />
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                            {strings.match.matchSetup}
                        </Typography>
                    </Box>

                    <FormControl fullWidth sx={{ mb: 2 }}>
                        <InputLabel>{strings.match.engine1WhiteFirst}</InputLabel>
                        <Select value={whiteEngine} label={strings.match.engine1WhiteFirst} onChange={(event) => setWhiteEngine(event.target.value)}>
                            {engines.map((engine) => (
                                <MenuItem key={engine.name} value={engine.name}>
                                    {engine.name}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    <FormControl fullWidth sx={{ mb: 3 }}>
                        <InputLabel>{strings.match.engine2BlackFirst}</InputLabel>
                        <Select value={blackEngine} label={strings.match.engine2BlackFirst} onChange={(event) => setBlackEngine(event.target.value)}>
                            {engines.map((engine) => (
                                <MenuItem key={engine.name} value={engine.name}>
                                    {engine.name}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    <TextField label={strings.match.numberOfGames} type="number" fullWidth value={numGames} onChange={(event) => setNumGames(Math.max(1, parseInt(event.target.value, 10) || 1))} inputProps={{ min: 1, max: 100 }} sx={{ mb: 3 }} />

                    <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
                        {strings.match.timePerMove((moveTime / 1000).toFixed(1))}
                    </Typography>
                    {anyWeightsBased ? (
                        <Box sx={{ p: 1, mb: 3, borderRadius: 1, bgcolor: 'action.hover', border: '1px solid', borderColor: 'divider' }}>
                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                {strings.match.fixedNodeLimit}
                            </Typography>
                        </Box>
                    ) : (
                        <Slider value={moveTime} onChange={(_, value) => setMoveTime(value as number)} min={100} max={10000} step={100} valueLabelDisplay="auto" valueLabelFormat={(value) => `${(value / 1000).toFixed(1)}s`} sx={{ mb: 3 }} />
                    )}

                    <Button variant="contained" size="large" fullWidth startIcon={<PlayIcon />} onClick={handleStartMatch} disabled={!whiteEngine || !blackEngine || engines.length === 0 || isStarting}>
                        {isStarting ? strings.match.starting : strings.match.startMatch}
                    </Button>

                    {engines.length < 1 && (
                        <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', mt: 2, color: 'warning.main' }}>
                            {strings.match.addAtLeastOneEngine}
                        </Typography>
                    )}
                </CardContent>
            </Card>
        </Fade>
    );

    const renderScoreCard = () => (
        score ? (
            <Card sx={{ bgcolor: 'background.paper' }}>
                <CardContent>
                    <Typography variant="subtitle2" sx={{ color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.1em', mb: 1.5 }}>
                        {strings.match.matchScore}
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
                        <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="h4" sx={{ fontWeight: 700, color: 'primary.main' }}>
                                {score.white.score}
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                {score.white.name}
                            </Typography>
                        </Box>
                        <Typography variant="h5" sx={{ color: 'text.secondary' }}>-</Typography>
                        <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="h4" sx={{ fontWeight: 700, color: 'secondary.main' }}>
                                {score.black.score}
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                {score.black.name}
                            </Typography>
                        </Box>
                    </Box>
                    <Divider sx={{ my: 1.5 }} />
                    <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', textAlign: 'center' }}>
                        {strings.match.gamesSummary(score.gamesPlayed, score.totalGames, score.draws)}
                    </Typography>
                </CardContent>
            </Card>
        ) : null
    );

    const renderCurrentPanel = () => {
        if (!isRunning && results.length === 0) {
            return renderSetupCard();
        }

        return (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {renderScoreCard()}
                <EngineInfo info={engineInfo} isThinking={isRunning} />
                <Box sx={{ minHeight: 180 }}>
                    <MoveList moves={currentMoves} currentMoveIndex={currentMoves.length - 1} />
                </Box>
                {results.length > 0 && (
                    <MatchResults
                        results={results}
                        onDownloadPGN={handleDownloadPGN}
                    />
                )}
            </Box>
        );
    };

    return (
        <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
                {strings.match.title}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', mb: 2, display: 'block' }}>
                {strings.match.subtitle}
            </Typography>

            <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                    <Box sx={{ flex: '0 0 auto' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5, gap: 1 }}>
                            <Chip
                                label={
                                    showingHistory
                                        ? strings.match.historyReplay
                                        : currentGame > 0
                                            ? strings.match.gameProgress(currentGame, numGames)
                                            : strings.match.readyToStart
                                }
                                color="primary"
                                size="small"
                                variant={showingHistory ? 'filled' : 'outlined'}
                                sx={{ height: 24, fontSize: '0.7rem' }}
                            />
                            {showingHistory && selectedHistoryEntry && (
                                <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
                                    {selectedHistoryEntry.white} vs {selectedHistoryEntry.black}
                                </Typography>
                            )}
                            {!showingHistory && currentWhite && currentBlack && (
                                <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
                                    {currentWhite} vs {currentBlack}
                                </Typography>
                            )}
                        </Box>

                        <ChessboardPanel
                            fen={showingHistory ? historySnapshot.fen : currentFen}
                            orientation="white"
                            interactive={false}
                            lastMove={showingHistory ? historySnapshot.lastMove : lastMove}
                            boardTheme={boardTheme}
                        />

                        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
                            {showingHistory ? (
                                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                    {strings.match.viewingSavedMatch}
                                </Typography>
                            ) : isRunning ? (
                                <Button variant="outlined" color="error" startIcon={<StopIcon />} onClick={handleStopMatch}>
                                    {strings.match.stopMatch}
                                </Button>
                            ) : results.length > 0 ? (
                                <Button variant="contained" startIcon={<PlayIcon />} onClick={handlePrepareNewMatch}>
                                    {strings.match.newMatch}
                                </Button>
                            ) : null}
                        </Box>
                    </Box>

                    <Box sx={{ flex: 1, minWidth: 320, display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 620 }}>
                        <Card sx={{ bgcolor: 'background.paper' }}>
                            <Tabs
                                value={sideTab}
                                onChange={(_, value: SideTab) => setSideTab(value)}
                                variant="fullWidth"
                                sx={{ borderBottom: '1px solid', borderColor: 'divider' }}
                            >
                                <Tab value="current" label={strings.match.currentMatchTab} />
                                <Tab value="history" label={strings.match.gameHistoryTab(historyEntries.length)} />
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
                                    emptyMessage={strings.match.completeMatchGameToAddHistory}
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
