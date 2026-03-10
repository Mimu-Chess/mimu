import { Paper, Typography, Box, LinearProgress } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Psychology as BrainIcon } from '@mui/icons-material';
interface EngineInfoData {
    depth?: number;
    score?: {
        type: 'cp' | 'mate';
        value: number;
    };
    pv?: string;
    nodes?: number;
    nps?: number;
}
interface EngineInfoProps {
    info: EngineInfoData | null;
    engineName?: string;
    isThinking?: boolean;
}
function formatScore(score: {
    type: 'cp' | 'mate';
    value: number;
}): string {
    if (score.type === 'mate') {
        return `M${score.value > 0 ? '+' : ''}${score.value}`;
    }
    const val = score.value / 100;
    return `${val > 0 ? '+' : ''}${val.toFixed(2)}`;
}
function formatNodes(nodes: number): string {
    if (nodes >= 1000000)
        return `${(nodes / 1000000).toFixed(1)}M`;
    if (nodes >= 1000)
        return `${(nodes / 1000).toFixed(1)}K`;
    return `${nodes}`;
}
export default function EngineInfo({ info, engineName, isThinking }: EngineInfoProps) {
    let evalBarValue = 50;
    if (info?.score) {
        if (info.score.type === 'cp') {
            evalBarValue = 50 + Math.max(-50, Math.min(50, info.score.value / 8));
        }
        else {
            evalBarValue = info.score.value > 0 ? 95 : 5;
        }
    }
    return (<Paper sx={{ p: 2, bgcolor: 'background.paper' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                <BrainIcon sx={{ color: 'primary.main', fontSize: 20 }}/>
                <Typography variant="subtitle2" sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.1em' }}>
                    Engine {engineName ? `- ${engineName}` : ''}
                </Typography>
            </Box>

            {isThinking && (<LinearProgress sx={{
                mb: 1.5,
                borderRadius: 1,
                height: 3,
                bgcolor: (theme) => alpha(theme.palette.primary.main, 0.12),
                '& .MuiLinearProgress-bar': {
                    bgcolor: 'primary.main',
                },
            }}/>)}

            {info ? (<Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    
                    <Box sx={{ position: 'relative', height: 24, borderRadius: 1, overflow: 'hidden', bgcolor: 'background.default' }}>
                        <Box sx={{
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: `${evalBarValue}%`,
                bgcolor: 'rgba(255, 255, 255, 0.85)',
                transition: 'width 0.3s ease',
                borderRadius: 1,
            }}/>
                        <Typography sx={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
                fontSize: '0.75rem',
                fontWeight: 700,
                fontFamily: '"JetBrains Mono", monospace',
                color: evalBarValue > 50 ? 'background.default' : '#fff',
                zIndex: 1,
            }}>
                            {info.score ? formatScore(info.score) : '0.00'}
                        </Typography>
                    </Box>

                    
                    <Box sx={{ display: 'flex', gap: 2 }}>
                        <Box>
                            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.65rem' }}>Depth</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: '"JetBrains Mono", monospace' }}>
                                {info.depth || '-'}
                            </Typography>
                        </Box>
                        {info.nodes && (<Box>
                                <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.65rem' }}>Nodes</Typography>
                                <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: '"JetBrains Mono", monospace' }}>
                                    {formatNodes(info.nodes)}
                                </Typography>
                            </Box>)}
                        {info.nps && (<Box>
                                <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.65rem' }}>NPS</Typography>
                                <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: '"JetBrains Mono", monospace' }}>
                                    {formatNodes(info.nps)}
                                </Typography>
                            </Box>)}
                    </Box>

                    
                    {info.pv && (<Box>
                            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.65rem' }}>Principal Variation</Typography>
                            <Typography variant="body2" sx={{
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: '0.75rem',
                    color: 'text.secondary',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                }}>
                                {info.pv}
                            </Typography>
                        </Box>)}
                </Box>) : (<Typography variant="body2" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
                    {isThinking ? 'Calculating...' : 'No engine data'}
                </Typography>)}
        </Paper>);
}
