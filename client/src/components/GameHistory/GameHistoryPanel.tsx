import { useEffect, useMemo, useRef, useState } from 'react';
import { Box, Button, Chip, Divider, Fade, FormControl, IconButton, InputLabel, List, ListItemButton, MenuItem, Paper, Popover, Select, Stack, Tooltip, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Download as DownloadIcon, FastForward as EndIcon, ChevronLeft as PrevIcon, ChevronRight as NextIcon, FirstPage as StartIcon, DeleteSweep as ClearHistoryIcon, CalendarMonth as CalendarIcon } from '@mui/icons-material';
import { Chess } from 'chess.js';
import MoveList from '../MoveList/MoveList';
import { useAppTheme } from '../../context/ThemeContext';

type HistoryTimeFilter = 'all' | 'today' | '7d' | '30d' | '90d' | 'custom';
const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOUR_OPTIONS = Array.from({ length: 24 }, (_, index) => index);
const MINUTE_OPTIONS = [0, 15, 30, 45];

export interface GameHistoryEntry {
    id: string;
    title: string;
    subtitle: string;
    result: string;
    moves: string[];
    pgn?: string;
    white: string;
    black: string;
    createdAt: string;
    mode?: 'play' | 'match';
    fileName?: string;
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

function pad2(value: number): string {
    return String(value).padStart(2, '0');
}

function parseLocalDateTime(value: string): Date | null {
    if (!value) {
        return null;
    }

    const [datePart, timePart = '00:00'] = value.split('T');
    const [year, month, day] = datePart.split('-').map(Number);
    const [hours, minutes] = timePart.split(':').map(Number);

    if ([year, month, day, hours, minutes].some((part) => Number.isNaN(part))) {
        return null;
    }

    return new Date(year, month - 1, day, hours, minutes, 0, 0);
}

function toLocalDateTimeValue(date: Date): string {
    return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}T${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

function formatDateTime(date: Date): string {
    return date.toLocaleString([], {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    });
}

function formatRangeSummary(startValue: string, endValue: string): string {
    const start = parseLocalDateTime(startValue);
    const end = parseLocalDateTime(endValue);

    if (!start && !end) {
        return 'Pick dates';
    }
    if (start && end) {
        return `${formatDateTime(start)} - ${formatDateTime(end)}`;
    }
    if (start) {
        return `From ${formatDateTime(start)}`;
    }
    return `Until ${formatDateTime(end!)}`;
}

function monthStart(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, delta: number): Date {
    return new Date(date.getFullYear(), date.getMonth() + delta, 1);
}

function sameDay(left: Date | null, right: Date | null): boolean {
    return !!left && !!right
        && left.getFullYear() === right.getFullYear()
        && left.getMonth() === right.getMonth()
        && left.getDate() === right.getDate();
}

function isBetweenDays(day: Date, start: Date | null, end: Date | null): boolean {
    if (!start || !end) {
        return false;
    }

    const dayValue = new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime();
    const startValue = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
    const endValue = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime();

    return dayValue > Math.min(startValue, endValue) && dayValue < Math.max(startValue, endValue);
}

function withTime(date: Date, source: Date | null, fallbackHours: number, fallbackMinutes: number): Date {
    return new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
        source?.getHours() ?? fallbackHours,
        source?.getMinutes() ?? fallbackMinutes,
        0,
        0,
    );
}

function endOfDay(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 0, 0);
}

function buildCalendarDays(viewDate: Date): Date[] {
    const first = monthStart(viewDate);
    const start = new Date(first);
    start.setDate(first.getDate() - first.getDay());

    return Array.from({ length: 42 }, (_, index) => {
        const day = new Date(start);
        day.setDate(start.getDate() + index);
        return day;
    });
}

function CustomRangePicker({
    open,
    anchorEl,
    startValue,
    endValue,
    onClose,
    onApply,
    onReset,
}: {
    open: boolean;
    anchorEl: HTMLElement | null;
    startValue: string;
    endValue: string;
    onClose: () => void;
    onApply: (nextStart: string, nextEnd: string) => void;
    onReset: () => void;
}) {
    const { appTheme } = useAppTheme();
    const [viewMonth, setViewMonth] = useState<Date>(() => monthStart(parseLocalDateTime(startValue) || new Date()));
    const [draftStart, setDraftStart] = useState<Date | null>(() => parseLocalDateTime(startValue));
    const [draftEnd, setDraftEnd] = useState<Date | null>(() => parseLocalDateTime(endValue));

    const calendarDays = useMemo(() => buildCalendarDays(viewMonth), [viewMonth]);

    useEffect(() => {
        if (!open) {
            return;
        }

        setDraftStart(parseLocalDateTime(startValue));
        setDraftEnd(parseLocalDateTime(endValue));
        setViewMonth(monthStart(parseLocalDateTime(startValue) || new Date()));
    }, [open, startValue, endValue]);

    const handleDayClick = (day: Date) => {
        if (!draftStart || draftEnd) {
            setDraftStart(withTime(day, draftStart, 0, 0));
            setDraftEnd(null);
            return;
        }

        const candidateStart = new Date(draftStart.getFullYear(), draftStart.getMonth(), draftStart.getDate()).getTime();
        const candidateDay = new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime();

        if (candidateDay < candidateStart) {
            setDraftStart(withTime(day, draftStart, 0, 0));
            setDraftEnd(null);
            return;
        }

        setDraftEnd(withTime(day, draftEnd, 23, 59));
    };

    const updateDraftTime = (target: 'start' | 'end', type: 'hours' | 'minutes', value: number) => {
        const source = target === 'start' ? draftStart : (draftEnd || (draftStart ? endOfDay(draftStart) : null));
        if (!source) {
            return;
        }

        const next = new Date(source);
        if (type === 'hours') {
            next.setHours(value);
        }
        else {
            next.setMinutes(value);
        }

        if (target === 'start') {
            setDraftStart(next);
        }
        else {
            setDraftEnd(next);
        }
    };

    const applyDraft = () => {
        if (!draftStart) {
            onApply('', '');
            return;
        }

        const normalizedEnd = draftEnd || endOfDay(draftStart);
        onApply(toLocalDateTimeValue(draftStart), toLocalDateTimeValue(normalizedEnd));
    };

    return (
        <Popover
            open={open}
            anchorEl={anchorEl}
            onClose={onClose}
            TransitionComponent={Fade}
            transitionDuration={160}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
            transformOrigin={{ vertical: 'top', horizontal: 'left' }}
            slotProps={{
                paper: {
                    sx: {
                        mt: 1,
                        p: 2,
                        width: 360,
                        borderRadius: 2.5,
                        backgroundColor: alpha(appTheme.bgPaper, 0.96),
                        borderColor: alpha(appTheme.primary, 0.22),
                        backdropFilter: 'blur(12px)',
                    },
                },
            }}
        >
            <Stack spacing={1.5}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                            Custom Time Range
                        </Typography>
                        <Stack direction="row" spacing={0.5}>
                            <IconButton size="small" onClick={() => setViewMonth((current) => addMonths(current, -1))}>
                                <PrevIcon fontSize="small" />
                            </IconButton>
                            <IconButton size="small" onClick={() => setViewMonth((current) => addMonths(current, 1))}>
                                <NextIcon fontSize="small" />
                            </IconButton>
                        </Stack>
                    </Box>

                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        {viewMonth.toLocaleString([], { month: 'long', year: 'numeric' })}
                    </Typography>

                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 0.5 }}>
                        {WEEKDAY_LABELS.map((label) => (
                            <Typography key={label} variant="caption" sx={{ textAlign: 'center', color: 'text.secondary', py: 0.5 }}>
                                {label}
                            </Typography>
                        ))}
                        {calendarDays.map((day) => {
                            const inCurrentMonth = day.getMonth() === viewMonth.getMonth();
                            const isStart = sameDay(day, draftStart);
                            const isEnd = sameDay(day, draftEnd);
                            const inRange = isBetweenDays(day, draftStart, draftEnd);

                            return (
                                <Box
                                    key={day.toISOString()}
                                    component="button"
                                    type="button"
                                    onClick={() => handleDayClick(day)}
                                    sx={{
                                        height: 38,
                                        borderRadius: 1.5,
                                        border: '1px solid',
                                        borderColor: isStart || isEnd ? 'transparent' : alpha(appTheme.primary, inCurrentMonth ? 0.12 : 0.06),
                                        backgroundColor: isStart || isEnd
                                            ? appTheme.primary
                                            : inRange
                                                ? alpha(appTheme.primary, 0.18)
                                                : alpha(appTheme.bgDefault, inCurrentMonth ? 0.18 : 0.08),
                                        color: isStart || isEnd
                                            ? '#ffffff'
                                            : inCurrentMonth
                                                ? 'text.primary'
                                                : 'text.secondary',
                                        cursor: 'pointer',
                                        font: 'inherit',
                                        transition: 'background-color 0.16s ease, border-color 0.16s ease',
                                        '&:hover': {
                                            backgroundColor: isStart || isEnd
                                                ? alpha(appTheme.primary, 0.92)
                                                : alpha(appTheme.primary, 0.24),
                                        },
                                    }}
                                >
                                    {day.getDate()}
                                </Box>
                            );
                        })}
                    </Box>

                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 1.25 }}>
                        <Box sx={{ p: 1.25, borderRadius: 2, bgcolor: alpha(appTheme.bgDefault, 0.28), border: '1px solid', borderColor: alpha(appTheme.primary, 0.12) }}>
                            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1 }}>
                                From
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 700, mb: 1 }}>
                                {draftStart ? formatDateTime(draftStart) : 'Not set'}
                            </Typography>
                            <Stack direction="row" spacing={1}>
                                <FormControl size="small" fullWidth>
                                    <InputLabel>Hour</InputLabel>
                                    <Select
                                        value={draftStart ? String(draftStart.getHours()) : ''}
                                        label="Hour"
                                        onChange={(event) => updateDraftTime('start', 'hours', Number(event.target.value))}
                                        disabled={!draftStart}
                                    >
                                        {HOUR_OPTIONS.map((hour) => (
                                            <MenuItem key={hour} value={String(hour)}>
                                                {pad2(hour)}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                                <FormControl size="small" fullWidth>
                                    <InputLabel>Min</InputLabel>
                                    <Select
                                        value={draftStart ? String(draftStart.getMinutes()) : ''}
                                        label="Min"
                                        onChange={(event) => updateDraftTime('start', 'minutes', Number(event.target.value))}
                                        disabled={!draftStart}
                                    >
                                        {MINUTE_OPTIONS.map((minute) => (
                                            <MenuItem key={minute} value={String(minute)}>
                                                {pad2(minute)}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Stack>
                        </Box>

                        <Box sx={{ p: 1.25, borderRadius: 2, bgcolor: alpha(appTheme.bgDefault, 0.28), border: '1px solid', borderColor: alpha(appTheme.secondary, 0.14) }}>
                            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1 }}>
                                To
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 700, mb: 1 }}>
                                {draftEnd ? formatDateTime(draftEnd) : (draftStart ? formatDateTime(endOfDay(draftStart)) : 'Not set')}
                            </Typography>
                            <Stack direction="row" spacing={1}>
                                <FormControl size="small" fullWidth>
                                    <InputLabel>Hour</InputLabel>
                                    <Select
                                        value={draftEnd ? String(draftEnd.getHours()) : (draftStart ? '23' : '')}
                                        label="Hour"
                                        onChange={(event) => updateDraftTime('end', 'hours', Number(event.target.value))}
                                        disabled={!draftStart}
                                    >
                                        {HOUR_OPTIONS.map((hour) => (
                                            <MenuItem key={hour} value={String(hour)}>
                                                {pad2(hour)}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                                <FormControl size="small" fullWidth>
                                    <InputLabel>Min</InputLabel>
                                    <Select
                                        value={draftEnd ? String(draftEnd.getMinutes()) : (draftStart ? '59' : '')}
                                        label="Min"
                                        onChange={(event) => updateDraftTime('end', 'minutes', Number(event.target.value))}
                                        disabled={!draftStart}
                                    >
                                        {[...MINUTE_OPTIONS, 59].map((minute) => (
                                            <MenuItem key={minute} value={String(minute)}>
                                                {pad2(minute)}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Stack>
                        </Box>
                    </Box>

                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        Click one date to set the start, then another to set the end.
                    </Typography>

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
                        <Button
                            size="small"
                            color="inherit"
                            onClick={() => {
                                setDraftStart(null);
                                setDraftEnd(null);
                                onReset();
                            }}
                        >
                            Reset
                        </Button>
                        <Stack direction="row" spacing={1}>
                            <Button size="small" color="inherit" onClick={onClose}>
                                Cancel
                            </Button>
                            <Button size="small" variant="contained" onClick={applyDraft}>
                                Apply
                            </Button>
                        </Stack>
                    </Box>
                </Stack>
        </Popover>
    );
}

function matchesTimeFilter(
    entry: GameHistoryEntry,
    filter: HistoryTimeFilter,
    customStart: string,
    customEnd: string,
): boolean {
    if (filter === 'all') {
        return true;
    }

    const createdAt = Date.parse(entry.createdAt);
    if (Number.isNaN(createdAt)) {
        return true;
    }

    if (filter === 'custom') {
        const start = customStart ? Date.parse(customStart) : Number.NEGATIVE_INFINITY;
        const end = customEnd ? Date.parse(customEnd) : Number.POSITIVE_INFINITY;
        const safeStart = Number.isNaN(start) ? Number.NEGATIVE_INFINITY : start;
        const safeEnd = Number.isNaN(end) ? Number.POSITIVE_INFINITY : end;
        return createdAt >= safeStart && createdAt <= safeEnd;
    }

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    if (filter === 'today') {
        return createdAt >= startOfToday;
    }

    const days = filter === '7d' ? 7 : filter === '30d' ? 30 : 90;
    return createdAt >= now.getTime() - (days * 24 * 60 * 60 * 1000);
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
    const [timeFilter, setTimeFilter] = useState<HistoryTimeFilter>('all');
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');
    const [customPickerOpen, setCustomPickerOpen] = useState(false);
    const timeFilterAnchorRef = useRef<HTMLDivElement | null>(null);
    const filteredEntries = useMemo(
        () => entries.filter((entry) => matchesTimeFilter(entry, timeFilter, customStart, customEnd)),
        [entries, timeFilter, customStart, customEnd],
    );

    useEffect(() => {
        if (timeFilter !== 'custom') {
            setCustomPickerOpen(false);
            return;
        }

        setCustomPickerOpen(true);
    }, [timeFilter]);

    const selectedEntry = useMemo(
        () => filteredEntries.find((entry) => entry.id === selectedEntryId) ?? filteredEntries[0] ?? null,
        [filteredEntries, selectedEntryId],
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
                        {filteredEntries.length} shown of {entries.length} saved {entries.length === 1 ? 'game' : 'games'}
                    </Typography>
                </Box>
                <Stack direction="row" spacing={1} alignItems="center" useFlexGap flexWrap="wrap">
                    <Box ref={timeFilterAnchorRef}>
                    <FormControl size="small" sx={{ minWidth: 132 }}>
                        <InputLabel>Time</InputLabel>
                        <Select
                            value={timeFilter}
                            label="Time"
                            onChange={(event) => {
                                const nextValue = event.target.value as HistoryTimeFilter;
                                setTimeFilter(nextValue);
                                setCustomPickerOpen(nextValue === 'custom');
                            }}
                        >
                            <MenuItem value="all">All time</MenuItem>
                            <MenuItem value="today">Today</MenuItem>
                            <MenuItem value="7d">Last 7 days</MenuItem>
                            <MenuItem value="30d">Last 30 days</MenuItem>
                            <MenuItem value="90d">Last 90 days</MenuItem>
                            <MenuItem value="custom">Custom range</MenuItem>
                        </Select>
                    </FormControl>
                    </Box>
                    {onClearHistory && (
                        <Button size="small" color="inherit" startIcon={<ClearHistoryIcon />} onClick={onClearHistory}>
                            Clear
                        </Button>
                    )}
                </Stack>
            </Box>
            {timeFilter === 'custom' && (
                <>
                    <Divider />
                    <Box sx={{ px: 2, py: 1.25, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            {formatRangeSummary(customStart, customEnd)}
                        </Typography>
                        <Tooltip title="Edit custom range">
                            <IconButton size="small" onClick={() => setCustomPickerOpen(true)}>
                                <CalendarIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    </Box>
                </>
            )}
            <CustomRangePicker
                open={customPickerOpen}
                anchorEl={timeFilterAnchorRef.current}
                startValue={customStart}
                endValue={customEnd}
                onClose={() => {
                    setCustomPickerOpen(false);
                    setTimeFilter('all');
                }}
                onApply={(nextStart, nextEnd) => {
                    setCustomStart(nextStart);
                    setCustomEnd(nextEnd);
                    setCustomPickerOpen(false);
                    setTimeFilter(nextStart || nextEnd ? 'custom' : 'all');
                }}
                onReset={() => {
                    setCustomStart('');
                    setCustomEnd('');
                    setCustomPickerOpen(false);
                    setTimeFilter('all');
                }}
            />
            <Divider />
            {filteredEntries.length === 0 ? (
                <Box sx={{ p: 2.5 }}>
                    <Typography variant="body2" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
                        No saved games match this time filter.
                    </Typography>
                </Box>
            ) : (
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', xl: '220px minmax(0, 1fr)' }, columnGap: { xl: 2 }, minHeight: 420 }}>
                <Box sx={{ maxHeight: { xs: 220, xl: 'none' }, overflow: 'auto' }}>
                    <List dense disablePadding>
                        {filteredEntries.map((entry) => (
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
                                        {new Date(entry.createdAt).toLocaleString()} · {entry.moves.length} plies
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
                                        {selectedEntry.subtitle === `${selectedEntry.white} vs ${selectedEntry.black}`
                                            ? new Date(selectedEntry.createdAt).toLocaleString()
                                            : selectedEntry.subtitle}
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
            )}
        </Paper>
    );
}
