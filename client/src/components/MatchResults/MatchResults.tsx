import { Paper, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton, Chip, Tooltip, } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Download as DownloadIcon } from '@mui/icons-material';
import { useAppSettings } from '../../context/SettingsContext';
interface MatchResult {
    gameNumber: number;
    white: string;
    black: string;
    result: string;
    pgn: string;
    moves: string[];
}
interface MatchResultsProps {
    results: MatchResult[];
    onDownloadPGN?: (pgn: string, gameNum: number) => void;
}
function resultChip(result: string) {
    if (result === '1-0')
        return <Chip label="1-0" size="small" sx={{ bgcolor: 'rgba(255,255,255,0.1)', fontWeight: 600, fontFamily: '"JetBrains Mono", monospace' }}/>;
    if (result === '0-1')
        return <Chip label="0-1" size="small" sx={{ bgcolor: 'rgba(255,255,255,0.1)', fontWeight: 600, fontFamily: '"JetBrains Mono", monospace' }}/>;
    if (result === '1/2-1/2')
        return <Chip label="½-½" size="small" color="default" variant="outlined" sx={{ fontWeight: 600, fontFamily: '"JetBrains Mono", monospace' }}/>;
    return <Chip label={result} size="small"/>;
}
export default function MatchResults({ results, onDownloadPGN }: MatchResultsProps) {
    const { strings } = useAppSettings();
    return (<Paper sx={{ p: 2, bgcolor: 'background.paper' }}>
            <Typography variant="subtitle2" sx={{ mb: 1.5, color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.1em' }}>
                {strings.matchResults.title}
            </Typography>
            <TableContainer>
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem' }}>#</TableCell>
                            <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem' }}>{strings.matchResults.white}</TableCell>
                            <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem' }}>{strings.matchResults.black}</TableCell>
                            <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem' }}>{strings.matchResults.result}</TableCell>
                            <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem' }}>{strings.matchResults.moves}</TableCell>
                            <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem' }}></TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {results.map((r) => (<TableRow key={r.gameNumber} sx={{ '&:hover': { bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08) } }}>
                                <TableCell sx={{ fontSize: '0.8rem' }}>{r.gameNumber}</TableCell>
                                <TableCell sx={{ fontSize: '0.8rem' }}>{r.white}</TableCell>
                                <TableCell sx={{ fontSize: '0.8rem' }}>{r.black}</TableCell>
                                <TableCell>{resultChip(r.result)}</TableCell>
                                <TableCell sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>{r.moves.length}</TableCell>
                                <TableCell>
                                    <Tooltip title={strings.common.downloadPgn}>
                                        <IconButton size="small" onClick={() => onDownloadPGN?.(r.pgn, r.gameNumber)} sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main' } }}>
                                            <DownloadIcon fontSize="small"/>
                                        </IconButton>
                                    </Tooltip>
                                </TableCell>
                            </TableRow>))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Paper>);
}
