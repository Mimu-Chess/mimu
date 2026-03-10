import { useState, useEffect, useRef } from 'react';
import { Box, Typography, Card, CardContent, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, IconButton, Chip, Snackbar, Alert, CircularProgress, Switch, FormControlLabel, Tooltip, Divider, InputAdornment, } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Add as AddIcon, Delete as DeleteIcon, Memory as EngineIcon, CheckCircle as ReadyIcon, FolderOpen as FolderIcon, AccountTree as WeightsIcon, } from '@mui/icons-material';
import { useSocket } from '../../hooks/useSocket';
import FileBrowserDialog from './FileBrowserDialog';
interface EngineConfig {
    name: string;
    path: string;
    type: string;
    hasWeightsFile?: boolean;
    weightsFile?: string;
    nodes?: number;
}
export default function EngineManagerPanel() {
    const { emit, on } = useSocket();
    const [engines, setEngines] = useState<EngineConfig[]>([]);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [newName, setNewName] = useState('');
    const [newPath, setNewPath] = useState('');
    const [useWeightsFile, setUseWeightsFile] = useState(false);
    const [weightsFilePath, setWeightsFilePath] = useState('');
    const [nodesPerMove, setNodesPerMove] = useState(1);
    const [isAdding, setIsAdding] = useState(false);
    const [fileBrowser, setFileBrowser] = useState<{
        open: boolean;
        accept: string[];
        onSelect: (p: string) => void;
        title: string;
    }>({ open: false, accept: [], onSelect: () => { }, title: 'Browse' });
    const [snackbar, setSnackbar] = useState<{
        open: boolean;
        message: string;
        severity: 'success' | 'error';
    }>({
        open: false,
        message: '',
        severity: 'success',
    });
    const addAckTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    useEffect(() => {
        emit('engine:list', (list: EngineConfig[]) => {
            setEngines(list);
        });
        const cleanup = on('engine:list-update', (list: EngineConfig[]) => {
            setEngines(list);
        });
        return cleanup;
    }, [emit, on]);
    useEffect(() => {
        return () => {
            if (addAckTimeoutRef.current) {
                clearTimeout(addAckTimeoutRef.current);
                addAckTimeoutRef.current = null;
            }
        };
    }, []);
    const openFileBrowser = (opts: {
        title: string;
        accept: string[];
        onSelect: (p: string) => void;
    }) => {
        setFileBrowser({ open: true, ...opts });
    };
    const handleCloseDialog = () => {
        if (isAdding)
            return;
        setDialogOpen(false);
        setNewName('');
        setNewPath('');
        setUseWeightsFile(false);
        setWeightsFilePath('');
        setNodesPerMove(1);
    };
    const handleAddEngine = async () => {
        if (!newName.trim() || !newPath.trim())
            return;
        if (useWeightsFile && !weightsFilePath.trim())
            return;
        setIsAdding(true);
        if (addAckTimeoutRef.current) {
            clearTimeout(addAckTimeoutRef.current);
            addAckTimeoutRef.current = null;
        }
        const timeoutMs = useWeightsFile ? 20000 : 8000;
        addAckTimeoutRef.current = setTimeout(() => {
            setIsAdding(false);
            setSnackbar({
                open: true,
                message: 'Engine validation timed out. Make sure this is a UCI executable and try again.',
                severity: 'error',
            });
        }, timeoutMs);
        const payload: any = { name: newName.trim(), path: newPath.trim() };
        if (useWeightsFile) {
            payload.weightsConfig = {
                weightsFile: weightsFilePath.trim(),
                nodes: nodesPerMove,
            };
        }
        emit('engine:add', payload, (response: any) => {
            if (addAckTimeoutRef.current) {
                clearTimeout(addAckTimeoutRef.current);
                addAckTimeoutRef.current = null;
            }
            setIsAdding(false);
            if (response.success) {
                handleCloseDialog();
                setSnackbar({ open: true, message: `Engine "${newName}" added successfully!`, severity: 'success' });
            }
            else {
                setSnackbar({ open: true, message: response.error || 'Failed to add engine', severity: 'error' });
            }
        });
    };
    const handleRemoveEngine = (name: string) => {
        emit('engine:remove', { name }, (response: any) => {
            if (response.success) {
                setSnackbar({ open: true, message: `Engine "${name}" removed`, severity: 'success' });
            }
        });
    };
    return (<Box>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                <Box>
                    <Typography variant="h4" sx={{ fontWeight: 700 }}>
                        Engines
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                        Manage your UCI chess engines
                    </Typography>
                </Box>
                <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
                    Add Engine
                </Button>
            </Box>

            {engines.length === 0 ? (<Card sx={{
                textAlign: 'center',
                py: 6,
                bgcolor: 'background.paper',
                border: (theme) => `2px dashed ${alpha(theme.palette.primary.main, 0.28)}`,
            }}>
                    <CardContent>
                        <EngineIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }}/>
                        <Typography variant="h6" sx={{ color: 'text.secondary', mb: 1 }}>
                            No engines configured
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
                            Add any UCI-compatible engine. Engines that use a separate weights file (e.g. LC0, Maia, Leela) are also supported.
                        </Typography>
                        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
                            Add Your First Engine
                        </Button>
                    </CardContent>
                </Card>) : (<Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {engines.map((engine) => (<Card key={engine.name} sx={{ bgcolor: 'background.paper' }}>
                            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, '&:last-child': { pb: 2 } }}>
                                {engine.hasWeightsFile
                    ? <WeightsIcon sx={{ color: 'secondary.main', fontSize: 32 }}/>
                    : <EngineIcon sx={{ color: 'primary.main', fontSize: 32 }}/>}
                                <Box sx={{ flex: 1 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                                            {engine.name}
                                        </Typography>
                                        {engine.hasWeightsFile ? (<Chip icon={<WeightsIcon sx={{ fontSize: 14 }}/>} label={`Weights · nodes=${engine.nodes ?? 1}`} size="small" color="secondary" variant="outlined" sx={{ height: 24 }}/>) : (<Chip icon={<ReadyIcon sx={{ fontSize: 14 }}/>} label="UCI" size="small" color="success" variant="outlined" sx={{ height: 24 }}/>)}
                                    </Box>
                                    <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: '"JetBrains Mono", monospace' }}>
                                        {engine.path}
                                    </Typography>
                                    {engine.hasWeightsFile && engine.weightsFile && (<Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: '"JetBrains Mono", monospace', display: 'block' }}>
                                            weights: {engine.weightsFile}
                                        </Typography>)}
                                </Box>
                                <IconButton onClick={() => handleRemoveEngine(engine.name)} sx={{
                    color: 'error.main',
                    '&:hover': { bgcolor: (theme) => alpha(theme.palette.error.main, 0.1) },
                }}>
                                    <DeleteIcon />
                                </IconButton>
                            </CardContent>
                        </Card>))}
                </Box>)}

            
            <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ fontWeight: 600 }}>Add UCI Engine</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                        Enter the name and full path to the UCI engine executable.
                    </Typography>

                    
                    <FormControlLabel control={<Switch checked={useWeightsFile} onChange={(e) => setUseWeightsFile(e.target.checked)} color="secondary" size="small"/>} label={<Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <WeightsIcon sx={{ fontSize: 16, color: useWeightsFile ? 'secondary.main' : 'text.disabled' }}/>
                                <Typography variant="body2">Uses a weights file</Typography>
                            </Box>} sx={{ mb: 2, ml: 0 }}/>

                    {useWeightsFile && (<Box sx={{
                p: 1.5, mb: 2, borderRadius: 1,
                bgcolor: (theme) => alpha(theme.palette.secondary.main, 0.08),
                border: (theme) => `1px solid ${alpha(theme.palette.secondary.main, 0.2)}`,
            }}>
                            <Typography variant="caption" sx={{ color: 'secondary.main', fontWeight: 600 }}>
                                The engine will receive a <code>setoption name WeightsFile</code> command before it is ready.
                                Supported by LC0, Leela Chess Zero, Maia, and other neural-network engines.
                            </Typography>
                        </Box>)}

                    <Divider sx={{ mb: 2 }}/>

                    <TextField autoFocus label="Engine Name" placeholder="e.g., Stockfish 16" fullWidth value={newName} onChange={(e) => setNewName(e.target.value)} sx={{ mb: 2 }}/>

                    <TextField label="Executable Path" placeholder="e.g., C:\engines\lc0.exe" fullWidth value={newPath} onChange={(e) => setNewPath(e.target.value)} helperText="Full path to the engine executable" sx={{ mb: useWeightsFile ? 2 : 0 }} slotProps={{
            input: {
                endAdornment: (<InputAdornment position="end">
                                        <Tooltip title="Browse for executable">
                                            <IconButton size="small" onClick={() => openFileBrowser({
                        title: 'Select Engine Executable',
                        accept: ['.exe'],
                        onSelect: setNewPath,
                    })} edge="end" sx={{ color: 'text.secondary' }}>
                                                <FolderIcon fontSize="small"/>
                                            </IconButton>
                                        </Tooltip>
                                    </InputAdornment>),
            },
        }}/>

                    {useWeightsFile && (<>
                            <TextField label="Weights File Path" placeholder="e.g., C:\engines\maia-1500.pb.gz" fullWidth value={weightsFilePath} onChange={(e) => setWeightsFilePath(e.target.value)} helperText="Full path to the weights file (.pb.gz, .pb, .bin, etc.)" sx={{ mb: 2 }} slotProps={{
                input: {
                    endAdornment: (<InputAdornment position="end">
                                                <Tooltip title="Browse for weights file">
                                                    <IconButton size="small" onClick={() => openFileBrowser({
                            title: 'Select Weights File',
                            accept: ['.gz', '.pb', '.bin'],
                            onSelect: setWeightsFilePath,
                        })} edge="end" sx={{ color: 'text.secondary' }}>
                                                        <FolderIcon fontSize="small"/>
                                                    </IconButton>
                                                </Tooltip>
                                            </InputAdornment>),
                },
            }}/>
                            <TextField label="Nodes per move" type="number" fullWidth value={nodesPerMove} onChange={(e) => setNodesPerMove(Math.max(1, parseInt(e.target.value) || 1))} inputProps={{ min: 1, max: 100000 }} helperText="Limit search nodes per move. Set to 1 for human-like engines like Maia. Leave higher for full strength."/>
                        </>)}
                </DialogContent>
                <DialogActions sx={{ p: 2, pt: 1 }}>
                    <Button onClick={handleCloseDialog} disabled={isAdding}>Cancel</Button>
                    <Button variant="contained" onClick={handleAddEngine} disabled={!newName.trim() || !newPath.trim() || (useWeightsFile && !weightsFilePath.trim()) || isAdding} startIcon={isAdding ? <CircularProgress size={16}/> : <AddIcon />} color={useWeightsFile ? 'secondary' : 'primary'}>
                        {isAdding ? (useWeightsFile ? 'Loading weights...' : 'Validating...') : 'Add Engine'}
                    </Button>
                </DialogActions>
            </Dialog>

            <FileBrowserDialog open={fileBrowser.open} title={fileBrowser.title} accept={fileBrowser.accept} onSelect={fileBrowser.onSelect} onClose={() => setFileBrowser((s) => ({ ...s, open: false }))}/>

            <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar((s) => ({ ...s, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
                <Alert onClose={() => setSnackbar((s) => ({ ...s, open: false }))} severity={snackbar.severity} variant="filled">
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>);
}
