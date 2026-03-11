import { Box, Typography, Paper, Chip } from '@mui/material';
import { alpha } from '@mui/material/styles';
interface MoveListProps {
    moves: string[];
    currentMoveIndex?: number;
    onMoveSelect?: (moveIndex: number) => void;
    title?: string;
}
export default function MoveList({ moves, currentMoveIndex, onMoveSelect, title = 'Moves' }: MoveListProps) {
    const movePairs: {
        number: number;
        white: string;
        black?: string;
    }[] = [];
    for (let i = 0; i < moves.length; i += 2) {
        movePairs.push({
            number: Math.floor(i / 2) + 1,
            white: moves[i],
            black: moves[i + 1],
        });
    }
    return (<Paper sx={{
            p: 2,
            height: '100%',
            overflow: 'auto',
            bgcolor: 'background.paper',
            '&::-webkit-scrollbar': {
                width: 6,
            },
            '&::-webkit-scrollbar-thumb': {
                bgcolor: (theme) => alpha(theme.palette.primary.main, 0.35),
                borderRadius: 3,
            },
        }}>
            <Typography variant="subtitle2" sx={{ mb: 1.5, color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.1em' }}>
                {title}
            </Typography>

            {movePairs.length === 0 ? (<Typography variant="body2" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
                    No moves yet
                </Typography>) : (<Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                    {movePairs.map((pair, idx) => {
                const whiteIdx = idx * 2;
                const blackIdx = idx * 2 + 1;
                const isCurrentWhite = currentMoveIndex !== undefined && currentMoveIndex === whiteIdx;
                const isCurrentBlack = currentMoveIndex !== undefined && currentMoveIndex === blackIdx;
                return (<Box key={pair.number} sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5,
                        py: 0.25,
                        px: 0.5,
                        borderRadius: 1,
                        '&:hover': {
                            bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
                        },
                    }}>
                                <Typography sx={{
                        width: 28,
                        fontSize: '0.75rem',
                        color: 'text.secondary',
                        fontWeight: 500,
                        flexShrink: 0,
                    }}>
                                    {pair.number}.
                                </Typography>
                                <Chip label={pair.white} size="small" variant={isCurrentWhite ? 'filled' : 'outlined'} color={isCurrentWhite ? 'primary' : 'default'} onClick={onMoveSelect ? () => onMoveSelect(whiteIdx) : undefined} clickable={!!onMoveSelect} sx={{
                        minWidth: 52,
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        fontFamily: '"JetBrains Mono", monospace',
                        border: isCurrentWhite ? undefined : '1px solid transparent',
                    }}/>
                                {pair.black && (<Chip label={pair.black} size="small" variant={isCurrentBlack ? 'filled' : 'outlined'} color={isCurrentBlack ? 'primary' : 'default'} onClick={onMoveSelect ? () => onMoveSelect(blackIdx) : undefined} clickable={!!onMoveSelect} sx={{
                            minWidth: 52,
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            fontFamily: '"JetBrains Mono", monospace',
                            border: isCurrentBlack ? undefined : '1px solid transparent',
                        }}/>)}
                            </Box>);
            })}
                </Box>)}
        </Paper>);
}
