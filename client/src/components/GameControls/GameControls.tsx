import { Box, Tooltip, IconButton } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Add as NewGameIcon, Flag as ResignIcon, Undo as UndoIcon, SwapVert as FlipIcon, Download as DownloadIcon, } from '@mui/icons-material';
interface GameControlsProps {
    onNewGame?: () => void;
    onResign?: () => void;
    onUndo?: () => void;
    onFlip?: () => void;
    onDownloadPGN?: () => void;
    isGameActive?: boolean;
    canUndo?: boolean;
    hasPGN?: boolean;
}
export default function GameControls({ onNewGame, onResign, onUndo, onFlip, onDownloadPGN, isGameActive = false, canUndo = false, hasPGN = false, }: GameControlsProps) {
    return (<Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center', mt: 1 }}>
            <Tooltip title="New Game">
                <IconButton size="small" onClick={onNewGame} sx={(theme) => ({ color: 'text.secondary', '&:hover': { color: 'primary.main', bgcolor: alpha(theme.palette.primary.main, 0.1) } })}>
                    <NewGameIcon fontSize="small"/>
                </IconButton>
            </Tooltip>
            <Tooltip title="Resign">
                <span>
                    <IconButton size="small" onClick={onResign} disabled={!isGameActive} sx={(theme) => ({ color: 'error.main', '&:hover': { bgcolor: alpha(theme.palette.error.main, 0.1) } })}>
                        <ResignIcon fontSize="small"/>
                    </IconButton>
                </span>
            </Tooltip>
            <Tooltip title="Undo">
                <span>
                    <IconButton size="small" onClick={onUndo} disabled={!canUndo} sx={(theme) => ({ color: 'text.secondary', '&:hover': { bgcolor: alpha(theme.palette.text.secondary, 0.12) } })}>
                        <UndoIcon fontSize="small"/>
                    </IconButton>
                </span>
            </Tooltip>
            <Tooltip title="Flip Board">
                <IconButton size="small" onClick={onFlip} sx={(theme) => ({ color: 'text.secondary', '&:hover': { bgcolor: alpha(theme.palette.text.secondary, 0.12) } })}>
                    <FlipIcon fontSize="small"/>
                </IconButton>
            </Tooltip>
            {hasPGN && (<Tooltip title="Download PGN">
                    <IconButton size="small" onClick={onDownloadPGN} sx={(theme) => ({ color: 'success.main', '&:hover': { bgcolor: alpha(theme.palette.success.main, 0.1) } })}>
                        <DownloadIcon fontSize="small"/>
                    </IconButton>
                </Tooltip>)}
        </Box>);
}
