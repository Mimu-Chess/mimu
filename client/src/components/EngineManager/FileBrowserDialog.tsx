import { useState, useEffect, useCallback, useMemo } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, List, ListItemButton, ListItemIcon, ListItemText, Typography, Box, CircularProgress, TextField, IconButton, Tooltip, Chip, Divider, } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Folder as FolderIcon, InsertDriveFile as FileIcon, ArrowUpward as UpIcon, Refresh as RefreshIcon, Computer as ComputerIcon, ChevronRight as ChevronRightIcon, Description as DocumentsIcon, Download as DownloadsIcon, Image as PicturesIcon, Movie as VideosIcon, LibraryMusic as MusicIcon, DesktopWindows as DesktopIcon, } from '@mui/icons-material';
interface FileEntry {
    name: string;
    fullPath: string;
    isDir: boolean;
}
interface BrowseResult {
    current: string;
    parent: string | null;
    entries: FileEntry[];
}
interface PlacesResult {
    entries: FileEntry[];
}
interface Props {
    open: boolean;
    title?: string;
    accept?: string[];
    onSelect: (fullPath: string) => void;
    onClose: () => void;
}
function getBreadcrumbs(currentPath: string): Array<{
    label: string;
    fullPath: string;
}> {
    if (!currentPath) {
        return [{ label: 'Computer', fullPath: '' }];
    }
    const normalized = currentPath.replace(/\//g, '\\');
    const driveMatch = normalized.match(/^[A-Za-z]:\\/);
    if (!driveMatch) {
        return [{ label: currentPath, fullPath: currentPath }];
    }
    const drive = driveMatch[0];
    const remainder = normalized.slice(drive.length).split('\\').filter(Boolean);
    const crumbs: Array<{
        label: string;
        fullPath: string;
    }> = [
        { label: 'Computer', fullPath: '' },
        { label: drive.replace('\\', ''), fullPath: drive },
    ];
    let running = drive;
    for (const part of remainder) {
        running = `${running}${part}\\`;
        crumbs.push({ label: part, fullPath: running });
    }
    return crumbs;
}
export default function FileBrowserDialog({ open, title = 'Browse Files', accept = [], onSelect, onClose }: Props) {
    const [result, setResult] = useState<BrowseResult | null>(null);
    const [places, setPlaces] = useState<FileEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [pathInput, setPathInput] = useState('');
    const loadRoot = useCallback(async () => {
        const [filesRes, placesRes] = await Promise.all([
            fetch('http://localhost:3001/api/files'),
            fetch('http://localhost:3001/api/files/places'),
        ]);
        const filesData = await filesRes.json();
        const placesData = await placesRes.json();
        if (!filesRes.ok)
            throw new Error(filesData.error || 'Failed to list drives');
        if (!placesRes.ok)
            throw new Error(placesData.error || 'Failed to list quick access folders');
        setPlaces((placesData as PlacesResult).entries || []);
        return filesData as BrowseResult;
    }, []);
    const navigate = useCallback(async (dir: string) => {
        setLoading(true);
        setError(null);
        try {
            const data = dir
                ? await (async () => {
                    const res = await fetch(`http://localhost:3001/api/files?path=${encodeURIComponent(dir)}`);
                    const json = await res.json();
                    if (!res.ok)
                        throw new Error(json.error || 'Failed to list directory');
                    return json as BrowseResult;
                })()
                : await loadRoot();
            setResult(data);
            setPathInput(data.current || '');
        }
        catch (e) {
            setError((e as Error).message);
        }
        finally {
            setLoading(false);
        }
    }, [loadRoot]);
    useEffect(() => {
        if (open) {
            navigate('');
        }
    }, [open, navigate]);
    const handleEntry = (entry: FileEntry) => {
        if (entry.isDir) {
            navigate(entry.fullPath);
        }
        else {
            onSelect(entry.fullPath);
            onClose();
        }
    };
    const handlePathSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        navigate(pathInput);
    };
    const filteredEntries = result?.entries.filter((entry) => {
        if (entry.isDir)
            return true;
        if (accept.length === 0)
            return true;
        const lower = entry.name.toLowerCase();
        return accept.some((ext) => lower.endsWith(ext.toLowerCase()));
    }) ?? [];
    const breadcrumbs = useMemo(() => getBreadcrumbs(result?.current || ''), [result?.current]);
    const activeFilterLabel = accept.length > 0 ? accept.join(', ') : 'All files';
    const currentPath = result?.current || '';
    const getPlaceIcon = (name: string) => {
        switch (name.toLowerCase()) {
            case 'desktop':
                return <DesktopIcon fontSize="small" sx={{ color: 'primary.main' }}/>;
            case 'documents':
                return <DocumentsIcon fontSize="small" sx={{ color: 'primary.main' }}/>;
            case 'downloads':
                return <DownloadsIcon fontSize="small" sx={{ color: 'secondary.main' }}/>;
            case 'pictures':
                return <PicturesIcon fontSize="small" sx={{ color: 'success.main' }}/>;
            case 'videos':
                return <VideosIcon fontSize="small" sx={{ color: 'warning.main' }}/>;
            case 'music':
                return <MusicIcon fontSize="small" sx={{ color: 'info.main' }}/>;
            default:
                return <FolderIcon fontSize="small" sx={{ color: 'warning.main' }}/>;
        }
    };
    return (<Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{
            sx: {
                overflow: 'hidden',
                borderRadius: 2,
                backgroundImage: 'none',
            },
        }}>
            <DialogTitle sx={{
            pb: 1,
            borderBottom: '1px solid',
            borderColor: 'divider',
            background: (theme) => `linear-gradient(180deg, ${alpha(theme.palette.primary.main, 0.14)} 0%, ${alpha(theme.palette.background.paper, 0.98)} 100%)`,
        }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    {title}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.25 }}>
                    Explorer-style picker inside the app window.
                </Typography>
            </DialogTitle>

            <DialogContent sx={{ p: 0, bgcolor: 'background.paper' }}>
                <Box sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1,
            px: 2,
            py: 1,
            bgcolor: (theme) => alpha(theme.palette.primary.main, 0.04),
        }}>
                    <Chip size="small" label={activeFilterLabel} color="primary" variant="outlined"/>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        {breadcrumbs.map((crumb, index) => (<Box key={crumb.fullPath || `root-${index}`} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Button size="small" onClick={() => navigate(crumb.fullPath)} sx={{
                minWidth: 0,
                px: 0.75,
                py: 0.25,
                color: currentPath === crumb.fullPath ? 'text.primary' : 'text.secondary',
                bgcolor: currentPath === crumb.fullPath ? (theme) => alpha(theme.palette.primary.main, 0.14) : 'transparent',
                '&:hover': {
                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
                },
            }}>
                                    {crumb.label}
                                </Button>
                                {index < breadcrumbs.length - 1 && <ChevronRightIcon sx={{ fontSize: 15, color: 'text.disabled' }}/>}
                            </Box>))}
                    </Box>
                </Box>
                <Divider />

                <Box component="form" onSubmit={handlePathSubmit} sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            px: 2,
            py: 1.25,
            borderBottom: '1px solid',
            borderColor: 'divider',
        }}>
                    <Tooltip title="Up one level">
                        <span>
                            <IconButton size="small" disabled={!result?.parent || loading} onClick={() => result?.parent && navigate(result.parent)}>
                                <UpIcon fontSize="small"/>
                            </IconButton>
                        </span>
                    </Tooltip>
                    <TextField size="small" fullWidth value={pathInput} onChange={(e) => setPathInput(e.target.value)} placeholder="Type a path and press Enter..." onKeyDown={(e) => e.key === 'Enter' && handlePathSubmit(e as any)} sx={{
            '& .MuiInputBase-input': {
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: '0.8rem',
            },
        }}/>
                    <Tooltip title="Refresh">
                        <IconButton size="small" type="submit" disabled={loading}>
                            <RefreshIcon fontSize="small"/>
                        </IconButton>
                    </Tooltip>
                </Box>

                <Box sx={{ display: 'grid', gridTemplateColumns: '220px minmax(0, 1fr)', minHeight: 420 }}>
                    <Box sx={{
            borderRight: '1px solid',
            borderColor: 'divider',
            bgcolor: (theme) => alpha(theme.palette.common.black, 0.12),
            px: 1,
            py: 1.5,
        }}>
                        <Typography variant="caption" sx={{ px: 1.5, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                            Locations
                        </Typography>
                        <List dense disablePadding sx={{ mt: 1 }}>
                            <ListItemButton selected={currentPath === ''} onClick={() => navigate('')} disableRipple>
                                <ListItemIcon sx={{ minWidth: 34 }}>
                                    <ComputerIcon fontSize="small" sx={{ color: 'primary.main' }}/>
                                </ListItemIcon>
                                <ListItemText primary="Computer" primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }}/>
                            </ListItemButton>
                            {places.map((place) => (<ListItemButton key={place.fullPath} selected={currentPath === place.fullPath || currentPath.startsWith(`${place.fullPath}\\`)} onClick={() => navigate(place.fullPath)} disableRipple>
                                    <ListItemIcon sx={{ minWidth: 34 }}>
                                        {getPlaceIcon(place.name)}
                                    </ListItemIcon>
                                    <ListItemText primary={place.name} primaryTypographyProps={{ variant: 'body2' }}/>
                                </ListItemButton>))}
                        </List>
                    </Box>

                    <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                        <Box sx={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1.35fr) 120px minmax(0, 1fr)',
            gap: 2,
            px: 2,
            py: 1,
            borderBottom: '1px solid',
            borderColor: 'divider',
            bgcolor: (theme) => alpha(theme.palette.common.white, 0.02),
        }}>
                            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, letterSpacing: '0.04em' }}>
                                Name
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, letterSpacing: '0.04em' }}>
                                Type
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, letterSpacing: '0.04em' }}>
                                Folder
                            </Typography>
                        </Box>

                        <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
                            {loading && (<Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
                                    <CircularProgress size={32}/>
                                </Box>)}
                            {error && (<Box sx={{ p: 3 }}>
                                    <Typography variant="body2" color="error">
                                        {error}
                                    </Typography>
                                </Box>)}
                            {!loading && !error && filteredEntries.length === 0 && (<Box sx={{ p: 3 }}>
                                    <Typography variant="body2" color="text.secondary">
                                        No matching files in this folder.
                                    </Typography>
                                </Box>)}
                            {!loading && !error && filteredEntries.map((entry) => (<Box key={entry.fullPath} onClick={() => handleEntry(entry)} sx={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1.35fr) 120px minmax(0, 1fr)',
                gap: 2,
                alignItems: 'center',
                px: 2,
                py: 1,
                cursor: 'pointer',
                transition: 'background-color 0.14s ease',
                '&:hover': {
                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
                },
            }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
                                        {entry.isDir
                ? <FolderIcon fontSize="small" sx={{ color: 'warning.main', flexShrink: 0 }}/>
                : <FileIcon fontSize="small" sx={{ color: 'text.secondary', flexShrink: 0 }}/>}
                                        <Typography variant="body2" sx={{
                minWidth: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                fontFamily: entry.isDir ? undefined : '"JetBrains Mono", monospace',
                fontWeight: entry.isDir ? 600 : 500,
            }}>
                                            {entry.name}
                                        </Typography>
                                    </Box>
                                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                        {entry.isDir ? 'Folder' : 'File'}
                                    </Typography>
                                    <Typography variant="caption" sx={{
                color: 'text.secondary',
                fontFamily: '"JetBrains Mono", monospace',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
            }}>
                                        {entry.isDir ? entry.fullPath : (result?.current || '')}
                                    </Typography>
                                </Box>))}
                        </Box>
                    </Box>
                </Box>
            </DialogContent>

            <DialogActions sx={{ px: 2, py: 1.25, borderTop: '1px solid', borderColor: 'divider' }}>
                <Button onClick={onClose} size="small">
                    Cancel
                </Button>
            </DialogActions>
        </Dialog>);
}
