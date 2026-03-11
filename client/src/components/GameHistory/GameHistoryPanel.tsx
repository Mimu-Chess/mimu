import { useMemo } from 'react';
import { Box, Button, Chip, Divider, IconButton, List, ListItemButton, Paper, Stack, Tooltip, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Download as DownloadIcon, FastForward as EndIcon, ChevronLeft as PrevIcon, ChevronRight as NextIcon, FirstPage as StartIcon, DeleteSweep as ClearHistoryIcon } from '@mui/icons-material';
import { Chess } from 'chess.js';
import MoveList from '../MoveList/MoveList';

export interface GameHistoryEntry {
    id: string;
    title: string;
    subtitle: string;
    result: string;
    moves: string[];
    pgn?: string;
    white: string;
    black: string;
}

export interface PlaybackSnapshot {
    fen: string;
    lastMove: {
        from: string;
        to: string;
    } | null;
}

export function buildHistoryPlayback(moves: string[]): PlaybackSnapshot[] {
    const chess = new Chess();
    const snapshots: PlaybackSnapshot[] = [
        {
            fen: chess.fen(),
            lastMove: null,
        },
    ];

    for (const moveSan of moves) {
        const move = chess.move(moveSan);
        if (!move) {
            break;
        }
        snapshots.push({
            fen: chess.fen(),
            lastMove: {
                from: move.from,
                to: move.to,
            },
        });
    }

    return snapshots;
}

interface GameHistoryPanelProps {
    entries: GameHistoryEntry[];
    selectedEntryId: string | null;
    onSelectEntry: (entryId: string) => void;
    selectedPlyIndex: number;
    onSelectPlyIndex: (plyIndex: number) => void;
    onDownloadPGN?: (entry: GameHistoryEntry) => void;
    emptyMessage?: string;
    onClearHistory?: () => void;
}

function resultLabel(result: string): string {
    if (result === '1/2-1/2') {
        return 'Draw';
    }
    return result;
}

export default function GameHistoryPanel({
    entries,
    selectedEntryId,
    onSelectEntry,
    selectedPlyIndex,
    onSelectPlyIndex,
    onDownloadPGN,
    emptyMessage = 'No completed games yet.',
    onClearHistory,
}: GameHistoryPanelProps) {
    const selectedEntry = useMemo(
        () => entries.find((entry) => entry.id === selectedEntryId) ?? entries[0] ?? null,
        [entries, selectedEntryId],
    );

    const playback = useMemo(
        () => (selectedEntry ? buildHistoryPlayback(selectedEntry.moves) : [{ fen: 'start', lastMove: null }]),
        [selectedEntry],
    );

    const boundedPlyIndex = Math.min(Math.max(selectedPlyIndex, 0), playback.length - 1);

    if (entries.length === 0) {
        return (
            <Paper sx={{ p: 2, bgcolor: 'background.paper' }}>
                <Box sx={{ mb: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                    <Typography variant="subtitle2" sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.1em' }}>
                        Game History
                    </Typography>
                    {onClearHistory && (
                        <Tooltip title="Clear history">
                            <IconButton size="small" onClick={onClearHistory}>
                                <ClearHistoryIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    )}
                </Box>
                <Typography variant="body2" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
                    {emptyMessage}
                </Typography>
            </Paper>
        );
    }

    return (
        <Paper sx={{ bgcolor: 'background.paper', overflow: 'hidden' }}>
            <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
                <Box>
                    <Typography variant="subtitle2" sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.1em' }}>
                        Game History
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        {entries.length} saved {entries.length === 1 ? 'game' : 'games'}
                    </Typography>
                </Box>
                {onClearHistory && (
                    <Button size="small" color="inherit" startIcon={<ClearHistoryIcon />} onClick={onClearHistory}>
                        Clear
                    </Button>
                )}
            </Box>
            <Divider />
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', xl: '220px minmax(0, 1fr)' }, columnGap: { xl: 2 }, minHeight: 420 }}>
                <Box sx={{ maxHeight: { xs: 220, xl: 'none' }, overflow: 'auto' }}>
                    <List dense disablePadding>
                        {entries.map((entry) => (
                            <ListItemButton
                                key={entry.id}
                                selected={entry.id === selectedEntry?.id}
                                onClick={() => onSelectEntry(entry.id)}
                                sx={{
                                    px: 2,
                                    py: 1.25,
                                    alignItems: 'flex-start',
                                    borderBottom: '1px solid',
                                    borderColor: alpha('#ffffff', 0.05),
                                }}
                            >
                                <Box sx={{ minWidth: 0, width: '100%' }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                                        <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>
                                            {entry.title}
                                        </Typography>
                                        <Chip label={resultLabel(entry.result)} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.65rem' }} />
                                    </Box>
                                    <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }} noWrap>
                                        {entry.subtitle}
                                    </Typography>
                                    <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.25 }}>
                                        {entry.moves.length} plies
                                    </Typography>
                                </Box>
                            </ListItemButton>
                        ))}
                    </List>
                </Box>
                <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1.5, minWidth: 0 }}>
                    {selectedEntry && (
                        <>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                                <Box>
                                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                                        {selectedEntry.white} vs {selectedEntry.black}
                                    </Typography>
                                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                        {selectedEntry.subtitle}
                                    </Typography>
                                </Box>
                                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                                    <Chip label={resultLabel(selectedEntry.result)} size="small" color="primary" variant="outlined" />
                                    <Chip label={`${selectedEntry.moves.length} plies`} size="small" variant="outlined" />
                                    {selectedEntry.pgn && (
                                        <Tooltip title="Download PGN">
                                            <IconButton size="small" onClick={() => onDownloadPGN?.(selectedEntry)}>
                                                <DownloadIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                    )}
                                </Stack>
                            </Box>
                            <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', alignItems: 'center' }}>
                                <Button size="small" startIcon={<StartIcon />} onClick={() => onSelectPlyIndex(0)} disabled={boundedPlyIndex === 0}>
                                    Start
                                </Button>
                                <Button size="small" startIcon={<PrevIcon />} onClick={() => onSelectPlyIndex(boundedPlyIndex - 1)} disabled={boundedPlyIndex === 0}>
                                    Prev
                                </Button>
                                <Button size="small" endIcon={<NextIcon />} onClick={() => onSelectPlyIndex(boundedPlyIndex + 1)} disabled={boundedPlyIndex >= selectedEntry.moves.length}>
                                    Next
                                </Button>
                                <Button size="small" endIcon={<EndIcon />} onClick={() => onSelectPlyIndex(selectedEntry.moves.length)} disabled={boundedPlyIndex >= selectedEntry.moves.length}>
                                    End
                                </Button>
                                <Typography variant="caption" sx={{ color: 'text.secondary', ml: 'auto' }}>
                                    Position {boundedPlyIndex} / {selectedEntry.moves.length}
                                </Typography>
                            </Box>
                            <Box sx={{ minHeight: 220 }}>
                                <MoveList
                                    title="Replay Moves"
                                    moves={selectedEntry.moves}
                                    currentMoveIndex={boundedPlyIndex > 0 ? boundedPlyIndex - 1 : undefined}
                                    onMoveSelect={(moveIndex) => onSelectPlyIndex(moveIndex + 1)}
                                />
                            </Box>
                        </>
                    )}
                </Box>
            </Box>
        </Paper>
    );
}
