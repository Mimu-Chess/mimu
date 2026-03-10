import { useState, useEffect, useMemo, useRef } from 'react';
import { Box, Typography, Card, CardContent, Button, FormControl, InputLabel, Select, MenuItem, TextField, Slider, Chip, Snackbar, Alert, Fade, Divider, Tooltip, IconButton, } from '@mui/material';
import { PlayArrow as PlayIcon, Stop as StopIcon, SmartToy as MatchIcon, Palette as ThemeIcon, } from '@mui/icons-material';
import ChessboardPanel from '../Chessboard/ChessboardPanel';
import MoveList from '../MoveList/MoveList';
import EngineInfo from '../EngineInfo/EngineInfo';
import MatchResults from '../MatchResults/MatchResults';
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
export default function AIvsAI() {
    const { emit, on, off } = useSocket();
    const { appTheme, themes, setThemeById } = useAppTheme();
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
    const [engineInfo, setEngineInfo] = useState<any>(null);
    const [currentWhite, setCurrentWhite] = useState('');
    const [currentBlack, setCurrentBlack] = useState('');
    const [showThemes, setShowThemes] = useState(false);
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
                setWhiteEngine(list[0].name);
                setBlackEngine(list[1].name);
            }
            else if (list.length === 1) {
                setWhiteEngine(list[0].name);
                setBlackEngine(list[0].name);
            }
        });
        const cleanup = on('engine:list-update', (list: EngineConfig[]) => {
            setEngines(list);
        });
        return cleanup;
    }, [emit, on]);
    useEffect(() => {
        const gameStartHandler = (info: {
            gameNum: number;
            white: string;
            black: string;
        }) => {
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
            if (state.lastMove)
                setLastMove(state.lastMove);
        };
        const engineInfoHandler = (data: any) => {
            setEngineInfo(data.info);
        };
        const matchUpdateHandler = (update: {
            result: MatchResult;
            score: MatchScore;
        }) => {
            setResults((prev) => [...prev, update.result]);
            setScore(update.score);
        };
        const matchEndHandler = (data: {
            results: MatchResult[];
            score: MatchScore;
        }) => {
            setIsRunning(false);
            setResults(data.results);
            setScore(data.score);
            setSnackbar({ open: true, message: 'Match completed!', severity: 'success' });
        };
        const matchErrorHandler = (err: any) => {
            setSnackbar({ open: true, message: `Error in game ${err.gameNum}: ${err.error}`, severity: 'error' });
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
    useEffect(() => {
        return () => {
            if (startAckTimeoutRef.current) {
                clearTimeout(startAckTimeoutRef.current);
                startAckTimeoutRef.current = null;
            }
        };
    }, []);
    const handleStartMatch = () => {
        if (!whiteEngine || !blackEngine)
            return;
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
        startAckTimeoutRef.current = setTimeout(() => {
            setIsStarting(false);
            setSnackbar({ open: true, message: 'Match start timed out. Check server connection and engine setup.', severity: 'error' });
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
                setSnackbar({ open: true, message: response.error || 'Failed to start match', severity: 'error' });
                return;
            }
            setIsRunning(true);
        });
    };
    const handleStopMatch = () => {
        emit('match:stop', () => { });
        setIsRunning(false);
    };
    const handleDownloadPGN = (pgnContent: string, gameNum: number) => {
        const blob = new Blob([pgnContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `game_${gameNum}.pgn`;
        a.click();
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
    const whiteEngineCfg = engines.find((e) => e.name === whiteEngine);
    const blackEngineCfg = engines.find((e) => e.name === blackEngine);
    const anyWeightsBased = whiteEngineCfg?.hasWeightsFile || blackEngineCfg?.hasWeightsFile;
    return (<Box>
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
                Engine Matches
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', mb: 2, display: 'block' }}>
                Run AI vs AI matches
            </Typography>

            {!isRunning && results.length === 0 ? (<Fade in>
                    <Card sx={{ maxWidth: 480, bgcolor: 'background.paper' }}>
                        <CardContent sx={{ p: 3 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                                <MatchIcon sx={{ color: 'primary.main' }}/>
                                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                    Match Setup
                                </Typography>
                            </Box>

                            <FormControl fullWidth sx={{ mb: 2 }}>
                                <InputLabel>Engine 1 (White first)</InputLabel>
                                <Select value={whiteEngine} label="Engine 1 (White first)" onChange={(e) => setWhiteEngine(e.target.value)}>
                                    {engines.map((eng) => (<MenuItem key={eng.name} value={eng.name}>
                                            {eng.name}
                                        </MenuItem>))}
                                </Select>
                            </FormControl>

                            <FormControl fullWidth sx={{ mb: 3 }}>
                                <InputLabel>Engine 2 (Black first)</InputLabel>
                                <Select value={blackEngine} label="Engine 2 (Black first)" onChange={(e) => setBlackEngine(e.target.value)}>
                                    {engines.map((eng) => (<MenuItem key={eng.name} value={eng.name}>
                                            {eng.name}
                                        </MenuItem>))}
                                </Select>
                            </FormControl>

                            <TextField label="Number of Games" type="number" fullWidth value={numGames} onChange={(e) => setNumGames(Math.max(1, parseInt(e.target.value) || 1))} inputProps={{ min: 1, max: 100 }} sx={{ mb: 3 }}/>

                            <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
                                Time per move: {(moveTime / 1000).toFixed(1)}s
                            </Typography>
                            {anyWeightsBased ? (<Box sx={{
                    p: 1, mb: 3, borderRadius: 1,
                    bgcolor: 'action.hover',
                    border: '1px solid',
                    borderColor: 'divider',
                }}>
                                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                        🎯 One or more engines use a fixed node limit per move.
                                        Standard engines still use the time-per-move slider.
                                    </Typography>
                                    {!anyWeightsBased && (<Slider value={moveTime} onChange={(_, val) => setMoveTime(val as number)} min={100} max={10000} step={100} valueLabelDisplay="auto" valueLabelFormat={(v) => `${(v / 1000).toFixed(1)}s`} sx={{ mt: 1 }}/>)}
                                </Box>) : (<Slider value={moveTime} onChange={(_, val) => setMoveTime(val as number)} min={100} max={10000} step={100} valueLabelDisplay="auto" valueLabelFormat={(v) => `${(v / 1000).toFixed(1)}s`} sx={{ mb: 3 }}/>)}

                            <Button variant="contained" size="large" fullWidth startIcon={<PlayIcon />} onClick={handleStartMatch} disabled={!whiteEngine || !blackEngine || engines.length === 0 || isStarting}>
                                {isStarting ? 'Starting...' : 'Start Match'}
                            </Button>

                            {engines.length < 1 && (<Typography variant="caption" sx={{ display: 'block', textAlign: 'center', mt: 2, color: 'warning.main' }}>
                                    Add at least one engine in the Engines page.
                                </Typography>)}
                        </CardContent>
                    </Card>
                </Fade>) : (<Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                    
                    <Box sx={{ flex: '0 0 auto' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                            <Chip label={currentGame > 0 ? `Game ${currentGame}/${numGames}` : 'Waiting...'} color="primary" size="small" variant="outlined" sx={{ height: 24, fontSize: '0.7rem' }}/>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                {currentWhite && currentBlack && (<Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
                                        {currentWhite} vs {currentBlack}
                                    </Typography>)}
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
                        width: 28, height: 28, borderRadius: 0.75, cursor: 'pointer', overflow: 'hidden',
                        border: appTheme.id === t.id ? '2px solid' : '2px solid transparent',
                        borderColor: appTheme.id === t.id ? 'primary.main' : 'transparent',
                        display: 'flex', transition: 'border-color 0.15s', '&:hover': { borderColor: 'primary.light' }
                    }}>
                                            <Box sx={{ width: '50%', height: '100%', bgcolor: t.boardLight }}/>
                                            <Box sx={{ width: '50%', height: '100%', bgcolor: t.boardDark }}/>
                                        </Box>
                                    </Tooltip>))}
                            </Box>)}
                        <ChessboardPanel fen={currentFen} orientation="white" interactive={false} lastMove={lastMove} boardTheme={boardTheme}/>
                        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
                            {isRunning ? (<Button variant="outlined" color="error" startIcon={<StopIcon />} onClick={handleStopMatch}>
                                    Stop Match
                                </Button>) : (<Button variant="contained" startIcon={<PlayIcon />} onClick={() => {
                    setResults([]);
                    setScore(null);
                    setCurrentFen('start');
                    setCurrentMoves([]);
                }}>
                                    New Match
                                </Button>)}
                        </Box>
                    </Box>

                    
                    <Box sx={{ flex: 1, minWidth: 280, display: 'flex', flexDirection: 'column', gap: 2 }}>
                        
                        {score && (<Card sx={{ bgcolor: 'background.paper' }}>
                                <CardContent>
                                    <Typography variant="subtitle2" sx={{ color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.1em', mb: 1.5 }}>
                                        Match Score
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
                                    <Divider sx={{ my: 1.5 }}/>
                                    <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', textAlign: 'center' }}>
                                        {score.gamesPlayed}/{score.totalGames} games - {score.draws} draws
                                    </Typography>
                                </CardContent>
                            </Card>)}

                        <EngineInfo info={engineInfo} isThinking={isRunning}/>

                        <Box sx={{ flex: 1, minHeight: 150 }}>
                            <MoveList moves={currentMoves} currentMoveIndex={currentMoves.length - 1}/>
                        </Box>

                        
                        {results.length > 0 && (<MatchResults results={results} onDownloadPGN={handleDownloadPGN}/>)}
                    </Box>
                </Box>)}

            <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar((s) => ({ ...s, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
                <Alert onClose={() => setSnackbar((s) => ({ ...s, open: false }))} severity={snackbar.severity} variant="filled">
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>);
}
