import { useCallback, useEffect, useMemo, useState } from 'react';
import { Chess } from 'chess.js';
import { Alert, Box, Button, Card, CardContent, Chip, FormControl, IconButton, InputLabel, MenuItem, Paper, Select, Slider, Snackbar, Typography } from '@mui/material';
import { ChevronLeft as PrevIcon, ChevronRight as NextIcon, PlayArrow as AnalyzeIcon, Psychology as AnalysisIcon, Stop as StopIcon, UploadFile as UploadIcon } from '@mui/icons-material';
import ChessboardPanel from '../Chessboard/ChessboardPanel';
import EngineInfo from '../EngineInfo/EngineInfo';
import FileBrowserDialog from '../EngineManager/FileBrowserDialog';
import GameHistoryPanel, { buildHistoryPlayback, type GameHistoryEntry } from '../GameHistory/GameHistoryPanel';
import { useSocket } from '../../hooks/useSocket';
import { useAppTheme } from '../../context/ThemeContext';
import { serverUrl } from '../../lib/server';
import { useAppSettings } from '../../context/SettingsContext';

const UPLOADED_ENTRY_ID = '__uploaded_pgn__';

interface EngineConfig { name: string; path: string; type: string; hasWeightsFile?: boolean; nodes?: number; weightsFile?: string; }
interface AnalysisProgress {
    plyIndex: number; bestmove: string; fen: string; engineName: string; info: { depth?: number; score?: { type: 'cp' | 'mate'; value: number }; pv?: string; nodes?: number; nps?: number; time?: number; multipv?: number } | null;
}
function formatScore(score?: { type: 'cp' | 'mate'; value: number } | null) { if (!score) return '-'; if (score.type === 'mate') return `M${score.value > 0 ? '+' : ''}${score.value}`; const value = score.value / 100; return `${value > 0 ? '+' : ''}${value.toFixed(2)}`; }
function isUciMove(move: string | null | undefined): move is string { return !!move && /^[a-h][1-8][a-h][1-8][qrbn]?$/i.test(move); }
function formatBestmove(bestmove: string | null | undefined, fallback: string) { if (!isUciMove(bestmove)) return fallback; const promotion = bestmove.length > 4 ? `=${bestmove[4].toUpperCase()}` : ''; return `${bestmove.slice(0, 2)}-${bestmove.slice(2, 4)}${promotion}`; }
function getPvMove(pv?: string) { const move = pv?.trim().split(/\s+/)[0]; return isUciMove(move) ? move : null; }
function parseArrow(bestmove: string | null | undefined) { if (!isUciMove(bestmove)) return null; return { from: bestmove.slice(0, 2), to: bestmove.slice(2, 4) }; }
function getPositionLabel(plyIndex: number, moves: string[], labels: { startPosition: string; afterMove: (move: string) => string; position: string }) { if (plyIndex === 0) return labels.startPosition; const previousMove = moves[plyIndex - 1]; return previousMove ? labels.afterMove(previousMove) : labels.position; }
function getSideToMove(fen: string, labels: { white: string; black: string }): string { return fen.split(' ')[1] === 'b' ? labels.black : labels.white; }
function stripPgnExtension(fileName: string) { return fileName.replace(/\.(pgn|txt)$/i, ''); }
function parsePgnDate(rawDate: string | undefined) { if (!rawDate) return new Date().toISOString(); const [year, month, day] = rawDate.split('.').map(Number); if ([year, month, day].some((part) => Number.isNaN(part) || part <= 0)) return new Date().toISOString(); return new Date(year, month - 1, day).toISOString(); }
function getFileNameFromPath(fullPath: string) { return fullPath.split(/[\\/]/).pop() || fullPath; }
function createImportedEntry(fileName: string, pgn: string): GameHistoryEntry {
    const chess = new Chess();
    chess.loadPgn(pgn, { strict: false });
    const moves = chess.history();
    if (moves.length === 0) throw new Error('PGN contains no moves.');
    const headers = chess.getHeaders();
    const white = headers.White?.trim() || 'White';
    const black = headers.Black?.trim() || 'Black';
    const title = headers.Event?.trim() && headers.Event !== '?' ? headers.Event.trim() : stripPgnExtension(fileName) || `${white} vs ${black}`;
    const subtitle = headers.Site?.trim() && headers.Site !== '?' ? headers.Site.trim() : `${white} vs ${black}`;
    return { id: `upload-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, title, subtitle, result: headers.Result?.trim() || '*', moves, pgn, white, black, createdAt: parsePgnDate(headers.Date), mode: 'play', fileName };
}

export default function GameAnalysisPanel() {
    const { emit, on, off } = useSocket();
    const { appTheme } = useAppTheme();
    const { strings } = useAppSettings();
    const [engines, setEngines] = useState<EngineConfig[]>([]);
    const [selectedEngine, setSelectedEngine] = useState('');
    const [historyEntries, setHistoryEntries] = useState<GameHistoryEntry[]>([]);
    const [uploadedEntry, setUploadedEntry] = useState<GameHistoryEntry | null>(null);
    const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);
    const [selectedHistoryPlyIndex, setSelectedHistoryPlyIndex] = useState(0);
    const [moveTime, setMoveTime] = useState(1500);
    const [analysisResults, setAnalysisResults] = useState<Record<number, AnalysisProgress>>({});
    const [liveAnalysisInfo, setLiveAnalysisInfo] = useState<AnalysisProgress['info'] | null>(null);
    const [currentAnalyzingPly, setCurrentAnalyzingPly] = useState<number | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' }>({ open: false, message: '', severity: 'info' });
    const [fileBrowser, setFileBrowser] = useState<{ open: boolean; accept: string[]; title: string }>({ open: false, accept: [], title: strings.fileBrowser.title });
    useEffect(() => {
        emit('engine:list', (list: EngineConfig[]) => {
            setEngines(list);
            if (list.length > 0) setSelectedEngine((current) => current || list[0].name);
        });
        emit('history:list', undefined, (response: { success: boolean; entries: GameHistoryEntry[] }) => {
            if (response?.success) setHistoryEntries(response.entries || []);
        });
        const cleanup = on('engine:list-update', (list: EngineConfig[]) => setEngines(list));
        return cleanup;
    }, [emit, on]);
    useEffect(() => {
        if (engines.length === 0) {
            setSelectedEngine('');
            return;
        }
        if (!engines.some((engine) => engine.name === selectedEngine)) setSelectedEngine(engines[0].name);
    }, [engines, selectedEngine]);
    useEffect(() => {
        const handleHistorySaved = (entry: GameHistoryEntry) => setHistoryEntries((prev) => [entry, ...prev.filter((item) => item.id !== entry.id)]);
        const handleHistoryCleared = () => {
            emit('history:list', undefined, (response: { success: boolean; entries: GameHistoryEntry[] }) => {
                if (response?.success) setHistoryEntries(response.entries || []);
            });
        };
        const handleAnalysisInfo = (payload: { plyIndex: number; info: AnalysisProgress['info'] }) => {
            setCurrentAnalyzingPly(payload.plyIndex);
            setLiveAnalysisInfo(payload.info);
        };
        const handleAnalysisProgress = (result: AnalysisProgress) => {
            setAnalysisResults((prev) => ({ ...prev, [result.plyIndex]: result }));
            setCurrentAnalyzingPly(result.plyIndex);
            setLiveAnalysisInfo(result.info);
        };
        const handleAnalysisComplete = (payload: { analyzedPositions: number }) => {
            setIsAnalyzing(false);
            setCurrentAnalyzingPly(null);
            setLiveAnalysisInfo(null);
            setSnackbar({ open: true, message: strings.analysis.analysisFinished(payload.analyzedPositions), severity: 'success' });
        };
        const handleAnalysisError = (payload: { error?: string }) => {
            setIsAnalyzing(false);
            setCurrentAnalyzingPly(null);
            setLiveAnalysisInfo(null);
            setSnackbar({ open: true, message: payload?.error || strings.analysis.analysisFailed, severity: 'error' });
        };
        on('history:saved', handleHistorySaved);
        on('history:cleared', handleHistoryCleared);
        on('analysis:info', handleAnalysisInfo);
        on('analysis:progress', handleAnalysisProgress);
        on('analysis:complete', handleAnalysisComplete);
        on('analysis:error', handleAnalysisError);
        return () => {
            off('history:saved', handleHistorySaved);
            off('history:cleared', handleHistoryCleared);
            off('analysis:info', handleAnalysisInfo);
            off('analysis:progress', handleAnalysisProgress);
            off('analysis:complete', handleAnalysisComplete);
            off('analysis:error', handleAnalysisError);
        };
    }, [emit, on, off]);
    useEffect(() => {
        if (historyEntries.length === 0 && !uploadedEntry) {
            setSelectedHistoryId(null);
            setSelectedHistoryPlyIndex(0);
            return;
        }

        if (selectedHistoryId === UPLOADED_ENTRY_ID && uploadedEntry) {
            return;
        }

        if (!selectedHistoryId) {
            setSelectedHistoryId(uploadedEntry ? UPLOADED_ENTRY_ID : historyEntries[0].id);
            setSelectedHistoryPlyIndex(0);
            return;
        }

        if (selectedHistoryId !== UPLOADED_ENTRY_ID && !historyEntries.some((entry) => entry.id === selectedHistoryId)) {
            setSelectedHistoryId(uploadedEntry ? UPLOADED_ENTRY_ID : historyEntries[0]?.id ?? null);
            setSelectedHistoryPlyIndex(0);
        }

        if (selectedHistoryId === UPLOADED_ENTRY_ID && !uploadedEntry) {
            setSelectedHistoryId(historyEntries[0]?.id ?? null);
            setSelectedHistoryPlyIndex(0);
        }
    }, [historyEntries, selectedHistoryId, uploadedEntry]);
    useEffect(() => {
        emit('analysis:stop', () => { });
        setAnalysisResults({});
        setLiveAnalysisInfo(null);
        setCurrentAnalyzingPly(null);
        setIsAnalyzing(false);
    }, [selectedHistoryId, selectedEngine, emit]);
    useEffect(() => () => {
        emit('analysis:stop', () => { });
    }, [emit]);
    const selectedHistoryEntry = useMemo(
        () => (selectedHistoryId === UPLOADED_ENTRY_ID
            ? uploadedEntry
            : historyEntries.find((entry) => entry.id === selectedHistoryId) ?? uploadedEntry ?? historyEntries[0] ?? null),
        [historyEntries, selectedHistoryId, uploadedEntry],
    );
    const historyPlayback = useMemo(
        () => (selectedHistoryEntry ? buildHistoryPlayback(selectedHistoryEntry.moves) : [{ fen: 'start', lastMove: null }]),
        [selectedHistoryEntry],
    );
    const maxPlyIndex = Math.max(historyPlayback.length - 1, 0);
    const historySnapshotIndex = Math.min(Math.max(selectedHistoryPlyIndex, 0), maxPlyIndex);
    const historySnapshot = historyPlayback[historySnapshotIndex];
    const selectedEngineConfig = engines.find((engine) => engine.name === selectedEngine);
    const isWeightsBased = selectedEngineConfig?.hasWeightsFile ?? false;
    const analysisLabels = useMemo(() => ({
        startPosition: strings.analysis.startPosition,
        afterMove: strings.analysis.afterMove,
        position: strings.analysis.position,
        white: strings.analysis.whiteToMove,
        black: strings.analysis.blackToMove,
        noMoveYet: strings.analysis.noMoveYet,
    }), [strings.analysis]);
    const currentAnalysis = analysisResults[historySnapshotIndex] ?? null;
    const isCurrentPositionThinking = isAnalyzing && currentAnalyzingPly === historySnapshotIndex;
    const displayedEngineInfo = currentAnalysis?.info ?? (isCurrentPositionThinking ? liveAnalysisInfo : null);
    const suggestedMove = currentAnalysis?.bestmove || (isCurrentPositionThinking ? getPvMove(liveAnalysisInfo?.pv) : null);
    const suggestedArrow = parseArrow(suggestedMove);
    const nextPlayedMove = selectedHistoryEntry?.moves[historySnapshotIndex] ?? null;
    const currentPositionLabel = selectedHistoryEntry ? getPositionLabel(historySnapshotIndex, selectedHistoryEntry.moves, analysisLabels) : strings.analysis.noGameSelected;
    const analyzedCount = Object.keys(analysisResults).length;
    const sideToMove = getSideToMove(historySnapshot.fen, analysisLabels);
    const isImportedEntry = selectedHistoryId === UPLOADED_ENTRY_ID;
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
    const goToPreviousPosition = useCallback(() => setSelectedHistoryPlyIndex((current) => Math.max(current - 1, 0)), []);
    const goToNextPosition = useCallback(() => setSelectedHistoryPlyIndex((current) => Math.min(current + 1, maxPlyIndex)), [maxPlyIndex]);
    useEffect(() => {
        if (!selectedHistoryEntry) return;
        const handleKeyDown = (event: KeyboardEvent) => {
            const target = event.target as HTMLElement | null;
            const tagName = target?.tagName;
            const isEditable = !!target?.isContentEditable || tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT';
            if (isEditable) return;
            if (event.key === 'ArrowLeft') {
                event.preventDefault();
                goToPreviousPosition();
            }
            if (event.key === 'ArrowRight') {
                event.preventDefault();
                goToNextPosition();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [goToNextPosition, goToPreviousPosition, selectedHistoryEntry]);
    const handleAnalyze = useCallback(() => {
        if (!selectedEngine || !selectedHistoryEntry) return;
        setIsAnalyzing(true);
        setAnalysisResults({});
        setLiveAnalysisInfo(null);
        setCurrentAnalyzingPly(null);
        emit('analysis:start', {
            engineName: selectedEngine,
            positions: historyPlayback.map((snapshot, plyIndex) => ({ plyIndex, fen: snapshot.fen })),
            movetime: moveTime,
        }, (response: { success: boolean; error?: string }) => {
            if (!response?.success) {
                setIsAnalyzing(false);
                setSnackbar({ open: true, message: response?.error || strings.analysis.couldNotStartAnalysis, severity: 'error' });
            }
        });
    }, [emit, historyPlayback, moveTime, selectedEngine, selectedHistoryEntry]);
    const handleStop = useCallback(() => {
        emit('analysis:stop', () => { });
        setIsAnalyzing(false);
        setCurrentAnalyzingPly(null);
        setLiveAnalysisInfo(null);
    }, [emit]);
    const handleClearHistory = useCallback(() => {
        emit('history:clear', undefined, () => { });
    }, [emit]);
    const handleDownloadHistoryPGN = useCallback((entry: GameHistoryEntry) => {
        if (!entry.pgn) return;
        const blob = new Blob([entry.pgn], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `${entry.title.replace(/\s+/g, '_')}.pgn`;
        anchor.click();
        URL.revokeObjectURL(url);
    }, []);
    const handleUploadPgnFromPath = useCallback(async (fullPath: string) => {
        try {
            const response = await fetch(serverUrl(`/api/files/read?path=${encodeURIComponent(fullPath)}`));
            const payload = await response.json();
            if (!response.ok) {
                throw new Error(payload.error || strings.analysis.couldNotLoadPgn);
            }
            const entry = createImportedEntry(getFileNameFromPath(fullPath), payload.content);
            setUploadedEntry(entry);
            setSelectedHistoryId(UPLOADED_ENTRY_ID);
            setSelectedHistoryPlyIndex(0);
            setSnackbar({ open: true, message: strings.analysis.loadedPgn(entry.title), severity: 'success' });
        }
        catch (error) {
            setSnackbar({ open: true, message: error instanceof Error ? error.message : strings.analysis.couldNotLoadPgn, severity: 'error' });
        }
    }, []);
    const clearUploadedPgn = useCallback(() => {
        setUploadedEntry(null);
        setSelectedHistoryId((current) => (current === UPLOADED_ENTRY_ID ? historyEntries[0]?.id ?? null : current));
        setSelectedHistoryPlyIndex(0);
    }, [historyEntries]);
    return (
        <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>{strings.analysis.title}</Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', mb: 2, display: 'block' }}>{strings.analysis.subtitle}</Typography>
            <Box sx={{ display: 'grid', gap: 2, alignItems: 'start', gridTemplateColumns: { xs: '1fr', xl: 'minmax(320px, 520px) minmax(340px, 640px)' } }}>
                <Box sx={{ minWidth: 0 }}>
                    <Box sx={{ width: 'min(100%, 520px)', display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <IconButton onClick={goToPreviousPosition} disabled={!selectedHistoryEntry || historySnapshotIndex === 0} color="primary"><PrevIcon /></IconButton>
                        <Box sx={{ flex: 1, minWidth: 0, textAlign: 'center' }}>
                            <Chip label={selectedHistoryEntry ? strings.analysis.positionCounter(historySnapshotIndex, selectedHistoryEntry.moves.length) : strings.analysis.noGameSelected} color="primary" size="small" variant="outlined" sx={{ height: 24, fontSize: '0.7rem', mb: 0.5 }} />
                            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }} noWrap>{currentPositionLabel}</Typography>
                        </Box>
                        <IconButton onClick={goToNextPosition} disabled={!selectedHistoryEntry || historySnapshotIndex >= maxPlyIndex} color="primary"><NextIcon /></IconButton>
                    </Box>
                    <ChessboardPanel fen={historySnapshot.fen} orientation="white" interactive={false} lastMove={historySnapshot.lastMove} arrows={suggestedArrow ? [{ ...suggestedArrow, color: 'rgba(56, 189, 248, 0.92)' }] : []} boardTheme={boardTheme} />
                    <Typography variant="caption" sx={{ color: 'text.secondary', mt: 1, display: 'block' }}>{strings.analysis.navigationHint}</Typography>
                    <Box sx={{ mt: 1.5, display: 'flex', flexDirection: 'column', gap: 1.5, width: 'min(100%, 520px)' }}>
                        <Card sx={{ bgcolor: 'background.paper' }}>
                            <CardContent sx={{ p: 2.25 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}><AnalysisIcon sx={{ color: 'primary.main', fontSize: 20 }} /><Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{strings.analysis.currentPosition}</Typography></Box>
                                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1.5 }}>
                                    <Chip label={strings.analysis.toMove(sideToMove)} size="small" variant="outlined" />
                                    {isImportedEntry && <Chip label={strings.analysis.uploadedPgn} size="small" color="secondary" variant="outlined" />}
                                    <Chip label={strings.analysis.best(formatBestmove(suggestedMove, analysisLabels.noMoveYet))} size="small" color={suggestedMove ? 'primary' : 'default'} variant={suggestedMove ? 'filled' : 'outlined'} />
                                    <Chip label={strings.analysis.eval(formatScore(displayedEngineInfo?.score))} size="small" variant="outlined" />
                                    <Chip label={strings.analysis.depth(displayedEngineInfo?.depth ?? '-')} size="small" variant="outlined" />
                                </Box>
                                <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>{nextPlayedMove ? strings.analysis.playedInGame(nextPlayedMove) : strings.analysis.finalBoardPosition}</Typography>
                                <Typography variant="body2" sx={{ color: 'text.secondary' }}>{suggestedMove ? strings.analysis.recommendation(formatBestmove(suggestedMove, analysisLabels.noMoveYet)) : isCurrentPositionThinking ? strings.analysis.engineSearching : strings.analysis.runAnalysisHint}</Typography>
                            </CardContent>
                        </Card>
                        <Card sx={{ bgcolor: 'background.paper' }}>
                            <CardContent sx={{ p: 2.25 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}><AnalysisIcon sx={{ color: 'primary.main', fontSize: 20 }} /><Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{strings.analysis.analysisSetup}</Typography></Box>
                                <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                                    <InputLabel>{strings.common.engine}</InputLabel>
                                    <Select value={selectedEngine} label={strings.common.engine} onChange={(event) => setSelectedEngine(event.target.value)}>{engines.map((engine) => <MenuItem key={engine.name} value={engine.name}>{engine.name}</MenuItem>)}</Select>
                                </FormControl>
                                <Typography variant="caption" sx={{ mb: 0.5, color: 'text.secondary', display: 'block' }}>{strings.analysis.analysisTime((moveTime / 1000).toFixed(1))}</Typography>
                                {isWeightsBased ? <Box sx={{ p: 1, mb: 2, borderRadius: 1, bgcolor: 'action.hover', border: '1px solid', borderColor: 'divider' }}><Typography variant="caption" sx={{ color: 'text.secondary' }}>{strings.analysis.nodesForAnalysis(selectedEngineConfig?.nodes ?? 1)}</Typography></Box> : <Slider value={moveTime} onChange={(_, value) => setMoveTime(value as number)} min={500} max={10000} step={500} valueLabelDisplay="auto" valueLabelFormat={(value) => `${(value / 1000).toFixed(1)}s`} size="small" sx={{ mb: 2 }} />}
                                <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                                    <Button variant="contained" startIcon={<AnalyzeIcon />} onClick={handleAnalyze} disabled={!selectedEngine || !selectedHistoryEntry} fullWidth>{strings.analysis.analyzeGame}</Button>
                                    <Button variant="outlined" color="inherit" startIcon={<StopIcon />} onClick={handleStop} disabled={!isAnalyzing}>{strings.analysis.stop}</Button>
                                </Box>
                                <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                    <Chip label={strings.analysis.analyzedCount(analyzedCount, historyPlayback.length)} size="small" variant="outlined" />
                                    <Chip label={strings.analysis.currentBest(formatBestmove(suggestedMove, analysisLabels.noMoveYet))} size="small" variant="outlined" />
                                    {selectedHistoryEntry && <Chip label={isImportedEntry ? strings.analysis.importedPgn : selectedHistoryEntry.mode === 'match' ? strings.analysis.matchHistory : strings.analysis.playHistory} size="small" variant="outlined" />}
                                </Box>
                            </CardContent>
                        </Card>
                        <EngineInfo info={displayedEngineInfo} engineName={selectedEngine} isThinking={isCurrentPositionThinking} />
                    </Box>
                </Box>
                <Box sx={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <GameHistoryPanel
                        entries={historyEntries}
                        selectedEntryId={selectedHistoryId === UPLOADED_ENTRY_ID ? null : selectedHistoryEntry?.id || null}
                        onSelectEntry={(entryId) => { setSelectedHistoryId(entryId); setSelectedHistoryPlyIndex(0); }}
                        selectedPlyIndex={historySnapshotIndex}
                        onSelectPlyIndex={setSelectedHistoryPlyIndex}
                        onDownloadPGN={handleDownloadHistoryPGN}
                        onClearHistory={handleClearHistory}
                        emptyMessage={strings.analysis.analyzeLater}
                        headerActions={<Button size="small" variant="outlined" color="inherit" startIcon={<UploadIcon />} onClick={() => setFileBrowser({ open: true, accept: ['.pgn', '.txt'], title: strings.analysis.selectPgnFile })}>{strings.analysis.uploadPgn}</Button>}
                        auxiliaryContent={uploadedEntry ? (
                            <Paper
                                variant="outlined"
                                sx={{
                                    p: 1.5,
                                    borderColor: selectedHistoryId === UPLOADED_ENTRY_ID ? 'primary.main' : 'divider',
                                    bgcolor: selectedHistoryId === UPLOADED_ENTRY_ID ? 'action.selected' : 'transparent',
                                }}
                            >
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                                    <Box sx={{ minWidth: 0 }}>
                                        <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>{uploadedEntry.title}</Typography>
                                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }} noWrap>
                                            {strings.analysis.temporaryPgnUpload}
                                        </Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                        <Button size="small" variant={selectedHistoryId === UPLOADED_ENTRY_ID ? 'contained' : 'outlined'} onClick={() => { setSelectedHistoryId(UPLOADED_ENTRY_ID); setSelectedHistoryPlyIndex(0); }}>
                                            {strings.analysis.usePgn}
                                        </Button>
                                        <Button size="small" color="inherit" onClick={clearUploadedPgn}>
                                            {strings.common.remove}
                                        </Button>
                                    </Box>
                                </Box>
                            </Paper>
                        ) : undefined}
                    />
                    <Paper sx={{ p: 2, bgcolor: 'background.paper' }}>
                        <Typography variant="subtitle2" sx={{ mb: 1.5, color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.1em' }}>{strings.analysis.moveByMoveAnalysis}</Typography>
                        {!selectedHistoryEntry ? <Typography variant="body2" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>{strings.analysis.chooseSavedGame}</Typography> : (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, maxHeight: 320, overflow: 'auto' }}>
                                {historyPlayback.map((snapshot, plyIndex) => {
                                    const result = analysisResults[plyIndex];
                                    const selected = plyIndex === historySnapshotIndex;
                                    const playedMove = selectedHistoryEntry.moves[plyIndex] ?? null;
                                    const rowThinking = isAnalyzing && currentAnalyzingPly === plyIndex;
                                    return (
                                        <Box key={plyIndex} onClick={() => setSelectedHistoryPlyIndex(plyIndex)} sx={{ p: 1, borderRadius: 1.5, cursor: 'pointer', border: '1px solid', borderColor: selected ? 'primary.main' : 'divider', bgcolor: selected ? 'action.selected' : 'transparent', display: 'grid', gridTemplateColumns: '56px minmax(0, 1fr) auto auto', gap: 1, alignItems: 'center' }}>
                                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>{plyIndex}</Typography>
                                            <Box sx={{ minWidth: 0 }}>
                                                <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>{getPositionLabel(plyIndex, selectedHistoryEntry.moves, analysisLabels)}</Typography>
                                                <Typography variant="caption" sx={{ color: 'text.secondary' }} noWrap>{playedMove ? strings.analysis.gameMove(playedMove) : strings.analysis.toMove(getSideToMove(snapshot.fen, analysisLabels))}</Typography>
                                            </Box>
                                            <Chip label={result ? formatScore(result.info?.score) : (rowThinking ? '...' : '-')} size="small" variant="outlined" />
                                            <Typography variant="caption" sx={{ color: 'text.secondary', minWidth: 88, textAlign: 'right' }}>{result ? formatBestmove(result.bestmove, analysisLabels.noMoveYet) : (rowThinking ? formatBestmove(getPvMove(liveAnalysisInfo?.pv), analysisLabels.noMoveYet) : '')}</Typography>
                                        </Box>
                                    );
                                })}
                            </Box>
                        )}
                    </Paper>
                </Box>
            </Box>
            <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar((state) => ({ ...state, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
                <Alert onClose={() => setSnackbar((state) => ({ ...state, open: false }))} severity={snackbar.severity} variant="filled">{snackbar.message}</Alert>
            </Snackbar>
            <FileBrowserDialog
                open={fileBrowser.open}
                title={fileBrowser.title}
                accept={fileBrowser.accept}
                onSelect={handleUploadPgnFromPath}
                onClose={() => setFileBrowser((current) => ({ ...current, open: false }))}
            />
        </Box>
    );
}
