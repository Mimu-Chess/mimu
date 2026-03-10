import { useState } from 'react';
import { Box, Drawer, IconButton, List, ListItemButton, ListItemIcon, ListItemText, Typography, useMediaQuery, useTheme, Divider, Toolbar, AppBar, Tooltip, Menu, MenuItem, } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Menu as MenuIcon, SportsEsports as PlayIcon, SmartToy as MatchIcon, Settings as EngineIcon, ChevronLeft as ChevronLeftIcon, Palette as PaletteIcon, Check as CheckIcon, } from '@mui/icons-material';
import { useAppTheme } from '../../context/ThemeContext';
const DRAWER_WIDTH = 214;
interface AppShellProps {
    activeView: string;
    onViewChange: (view: string) => void;
    children: React.ReactNode;
}
const navItems = [
    { id: 'play', label: 'Play vs AI', icon: <PlayIcon sx={{ fontSize: 18 }}/> },
    { id: 'match', label: 'Engine Matches', icon: <MatchIcon sx={{ fontSize: 18 }}/> },
    { id: 'engines', label: 'Engines', icon: <EngineIcon sx={{ fontSize: 18 }}/> },
];
export default function AppShell({ activeView, onViewChange, children }: AppShellProps) {
    const muiTheme = useTheme();
    const { appTheme, themes, setThemeById } = useAppTheme();
    const isMobile = useMediaQuery(muiTheme.breakpoints.down('lg'));
    const [mobileOpen, setMobileOpen] = useState(false);
    const [paletteAnchor, setPaletteAnchor] = useState<null | HTMLElement>(null);
    const handleNavClick = (viewId: string) => {
        onViewChange(viewId);
        if (isMobile)
            setMobileOpen(false);
    };
    const drawerContent = (<Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            
            <Box sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            px: 2,
            pt: 2,
            pb: 1.5,
        }}>
                <Typography sx={{
            fontSize: '0.92rem',
            fontWeight: 800,
            letterSpacing: '-0.02em',
            background: `linear-gradient(135deg, ${muiTheme.palette.primary.main} 10%, ${muiTheme.palette.secondary.main} 100%)`,
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            color: 'transparent',
            flex: 1,
        }}>
                    Mimu Chess
                </Typography>
                {isMobile && (<IconButton onClick={() => setMobileOpen(false)} size="small" sx={{ ml: 'auto', color: 'text.secondary' }}>
                        <ChevronLeftIcon fontSize="small"/>
                    </IconButton>)}
            </Box>

            <Divider sx={{ mx: 1.5, mb: 0.5, borderColor: alpha(appTheme.primary, 0.15) }}/>

            
            <List sx={{ px: 0, pt: 1, flex: 1 }}>
                {navItems.map((item, idx) => {
            const isActive = activeView === item.id;
            return (<Box key={item.id}>
                            <ListItemButton selected={isActive} onClick={() => handleNavClick(item.id)} sx={{
                    py: 1.1,
                    px: 1.5,
                    borderRadius: '12px',
                    mx: 1,
                    minHeight: 44,
                    transition: 'all 0.15s ease',
                    '&.Mui-selected': {
                        bgcolor: alpha(muiTheme.palette.primary.main, 0.18),
                        '&:hover': { bgcolor: alpha(muiTheme.palette.primary.main, 0.26) },
                    },
                    '&:not(.Mui-selected):hover': {
                        bgcolor: alpha('#ffffff', 0.05),
                        transform: 'translateX(3px)',
                    },
                }}>
                                <ListItemIcon sx={{
                    minWidth: 28,
                    color: isActive ? 'primary.main' : 'text.secondary',
                    transition: 'color 0.15s',
                }}>
                                    {item.icon}
                                </ListItemIcon>
                                <ListItemText primary={item.label} primaryTypographyProps={{
                    fontSize: '0.8rem',
                    fontWeight: isActive ? 700 : 400,
                    color: isActive ? muiTheme.palette.primary.main : undefined,
                }}/>
                                {isActive && (<Box sx={{
                        width: 3, height: 20, borderRadius: 99,
                        bgcolor: 'primary.main',
                        boxShadow: `0 0 6px ${alpha(muiTheme.palette.primary.main, 0.7)}`,
                    }}/>)}
                            </ListItemButton>
                            {idx < navItems.length - 1 && (<Divider sx={{ mx: 2.5, my: 0.6, borderColor: alpha(appTheme.primary, 0.12) }}/>)}
                        </Box>);
        })}

            </List>

            <Divider sx={{ mx: 1.5, borderColor: alpha(appTheme.primary, 0.12) }}/>

            
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1.2 }}>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.6rem' }}>
                    v1.0 · UCI
                </Typography>
                <Tooltip title="Change theme">
                    <IconButton size="small" onClick={(e) => setPaletteAnchor(e.currentTarget)} sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main' } }}>
                        <PaletteIcon sx={{ fontSize: 16 }}/>
                    </IconButton>
                </Tooltip>
            </Box>
        </Box>);
    return (<Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
            
            {isMobile && (<AppBar position="fixed" sx={{ zIndex: muiTheme.zIndex.drawer + 1 }}>
                    <Toolbar variant="dense" sx={{ minHeight: 44 }}>
                        <IconButton color="inherit" edge="start" onClick={() => setMobileOpen(true)} size="small" sx={{ mr: 1 }}>
                            <MenuIcon fontSize="small"/>
                        </IconButton>
                        <Box sx={{
                width: 22, height: 22, borderRadius: '7px',
                background: `linear-gradient(135deg, ${appTheme.primary}, ${appTheme.secondary})`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '12px', mr: 1,
            }}>
                            ♟
                        </Box>
                        <Typography sx={{
                fontSize: '0.9rem',
                fontWeight: 800,
                background: `linear-gradient(135deg, ${muiTheme.palette.primary.main} 0%, ${muiTheme.palette.secondary.main} 100%)`,
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                color: 'transparent',
            }}>
                            Mimu Chess
                        </Typography>
                    </Toolbar>
                </AppBar>)}

            
            <Drawer variant={isMobile ? 'temporary' : 'permanent'} open={isMobile ? mobileOpen : true} onClose={() => setMobileOpen(false)} sx={{
            width: DRAWER_WIDTH,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
                width: DRAWER_WIDTH,
                boxSizing: 'border-box',
            },
        }}>
                {drawerContent}
            </Drawer>

            
            <Menu anchorEl={paletteAnchor} open={Boolean(paletteAnchor)} onClose={() => setPaletteAnchor(null)} slotProps={{ paper: { sx: { minWidth: 160, borderRadius: '14px' } } }} transformOrigin={{ vertical: 'bottom', horizontal: 'left' }} anchorOrigin={{ vertical: 'top', horizontal: 'left' }}>
                {themes.map((t) => (<MenuItem key={t.id} onClick={() => { setThemeById(t.id); setPaletteAnchor(null); }} sx={{ gap: 1.5, borderRadius: '10px', mx: 0.5, my: 0.25, fontSize: '0.82rem' }}>
                        
                        <Box sx={{
                width: 14, height: 14, borderRadius: '50%', flexShrink: 0,
                background: `linear-gradient(135deg, ${t.primary}, ${t.secondary})`,
                boxShadow: `0 2px 6px ${alpha(t.primary, 0.5)}`,
            }}/>
                        {t.name}
                        {appTheme.id === t.id && (<CheckIcon sx={{ fontSize: 14, ml: 'auto', color: 'primary.main' }}/>)}
                    </MenuItem>))}
            </Menu>

            
            <Box component="main" sx={{
            flexGrow: 1,
            p: { xs: 1.5, md: 2.5 },
            mt: isMobile ? '44px' : 0,
            width: { lg: `calc(100% - ${DRAWER_WIDTH}px)` },
            minHeight: '100vh',
            overflow: 'auto',
        }}>
                {children}
            </Box>
        </Box>);
}
