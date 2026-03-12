import { useState } from 'react';
import { Box, Drawer, IconButton, List, ListItemButton, ListItemIcon, ListItemText, Typography, useMediaQuery, useTheme, Divider, Toolbar, AppBar, Tooltip } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Menu as MenuIcon, SportsEsports as PlayIcon, SmartToy as MatchIcon, ManageSearch as AnalysisIcon, Memory as EngineIcon, ChevronLeft as ChevronLeftIcon } from '@mui/icons-material';
import { useAppTheme } from '../../context/ThemeContext';
import { useAppSettings } from '../../context/SettingsContext';
import { Settings as SettingsIcon } from '@mui/icons-material';
import type { AppViewId } from '../../lib/desktopConfig';

const DEFAULT_DRAWER_WIDTH = 214;
const COMPACT_DRAWER_WIDTH = 188;
interface AppShellProps {
    activeView: AppViewId;
    onViewChange: (view: AppViewId) => void;
    children: React.ReactNode;
}
export default function AppShell({ activeView, onViewChange, children }: AppShellProps) {
    const muiTheme = useTheme();
    const { appTheme } = useAppTheme();
    const { strings, compactSidebar } = useAppSettings();
    const isMobile = useMediaQuery(muiTheme.breakpoints.down('lg'));
    const [mobileOpen, setMobileOpen] = useState(false);
    const appVersion = __APP_VERSION__;
    const drawerWidth = compactSidebar ? COMPACT_DRAWER_WIDTH : DEFAULT_DRAWER_WIDTH;
    const navItems: Array<{ id: AppViewId; label: string; icon: React.ReactNode }> = [
        { id: 'play', label: strings.navPlay, icon: <PlayIcon sx={{ fontSize: 18 }}/> },
        { id: 'match', label: strings.navMatch, icon: <MatchIcon sx={{ fontSize: 18 }}/> },
        { id: 'analysis', label: strings.navAnalysis, icon: <AnalysisIcon sx={{ fontSize: 18 }}/> },
        { id: 'engines', label: strings.navEngines, icon: <EngineIcon sx={{ fontSize: 18 }}/> },
    ];

    const handleNavClick = (viewId: AppViewId) => {
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
                            <ListItemButton data-tour={`nav-${item.id}`} selected={isActive} onClick={() => handleNavClick(item.id)} sx={{
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
                    fontSize: compactSidebar ? '0.74rem' : '0.8rem',
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
                    v{appVersion}
                </Typography>
                <Tooltip title={strings.navSettings}>
                    <IconButton size="small" onClick={() => handleNavClick('settings')} sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main' } }}>
                        <SettingsIcon sx={{ fontSize: 16 }}/>
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
            width: drawerWidth,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
                width: drawerWidth,
                boxSizing: 'border-box',
            },
        }}>
                {drawerContent}
            </Drawer>

            <Box component="main" sx={{
            flexGrow: 1,
            p: { xs: 1.5, md: 2.5 },
            mt: isMobile ? '44px' : 0,
            width: { lg: `calc(100% - ${drawerWidth}px)` },
            minHeight: '100vh',
            overflow: 'auto',
        }}>
                {children}
            </Box>
        </Box>);
}
