import { useState } from 'react';
import { Box, Drawer, IconButton, List, ListItemButton, ListItemIcon, ListItemText, Typography, useMediaQuery, useTheme, Divider, Toolbar, AppBar, Tooltip, Menu, MenuItem, InputBase, Slider, Dialog, DialogTitle, DialogContent, } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Menu as MenuIcon, SportsEsports as PlayIcon, SmartToy as MatchIcon, ManageSearch as AnalysisIcon, Memory as EngineIcon, ChevronLeft as ChevronLeftIcon, Palette as PaletteIcon, Check as CheckIcon, Tune as CustomThemeIcon, } from '@mui/icons-material';
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
    { id: 'analysis', label: 'Game Analysis', icon: <AnalysisIcon sx={{ fontSize: 18 }}/> },
    { id: 'engines', label: 'Engines', icon: <EngineIcon sx={{ fontSize: 18 }}/> },
];

function clamp(value: number, min: number, max: number) {
    return Math.min(Math.max(value, min), max);
}

function hexToRgb(value: string) {
    const color = value.trim().replace('#', '');
    return {
        r: parseInt(color.slice(0, 2), 16),
        g: parseInt(color.slice(2, 4), 16),
        b: parseInt(color.slice(4, 6), 16),
    };
}

function rgbToHex(r: number, g: number, b: number) {
    return `#${[r, g, b]
        .map((channel) => clamp(Math.round(channel), 0, 255).toString(16).padStart(2, '0'))
        .join('')}`;
}

function hexToHsl(value: string) {
    const { r, g, b } = hexToRgb(value);
    const nr = r / 255;
    const ng = g / 255;
    const nb = b / 255;
    const max = Math.max(nr, ng, nb);
    const min = Math.min(nr, ng, nb);
    const delta = max - min;
    let h = 0;
    const l = (max + min) / 2;
    const s = delta === 0 ? 0 : delta / (1 - Math.abs((2 * l) - 1));

    if (delta !== 0) {
        switch (max) {
            case nr:
                h = 60 * (((ng - nb) / delta) % 6);
                break;
            case ng:
                h = 60 * (((nb - nr) / delta) + 2);
                break;
            default:
                h = 60 * (((nr - ng) / delta) + 4);
                break;
        }
    }

    return {
        h: h < 0 ? h + 360 : h,
        s: s * 100,
        l: l * 100,
    };
}

function hslToHex(h: number, s: number, l: number) {
    const hue = ((h % 360) + 360) % 360;
    const sat = clamp(s, 0, 100) / 100;
    const light = clamp(l, 0, 100) / 100;
    const chroma = (1 - Math.abs((2 * light) - 1)) * sat;
    const x = chroma * (1 - Math.abs(((hue / 60) % 2) - 1));
    const m = light - (chroma / 2);
    let r = 0;
    let g = 0;
    let b = 0;

    if (hue < 60) {
        r = chroma;
        g = x;
    }
    else if (hue < 120) {
        r = x;
        g = chroma;
    }
    else if (hue < 180) {
        g = chroma;
        b = x;
    }
    else if (hue < 240) {
        g = x;
        b = chroma;
    }
    else if (hue < 300) {
        r = x;
        b = chroma;
    }
    else {
        r = chroma;
        b = x;
    }

    return rgbToHex((r + m) * 255, (g + m) * 255, (b + m) * 255);
}

export default function AppShell({ activeView, onViewChange, children }: AppShellProps) {
    const muiTheme = useTheme();
    const { appTheme, themes, setThemeById, setCustomThemeColor, customThemeColor } = useAppTheme();
    const isMobile = useMediaQuery(muiTheme.breakpoints.down('lg'));
    const [mobileOpen, setMobileOpen] = useState(false);
    const [paletteAnchor, setPaletteAnchor] = useState<null | HTMLElement>(null);
    const [customThemeDialogOpen, setCustomThemeDialogOpen] = useState(false);
    const appVersion = __APP_VERSION__;
    const customThemeHsl = hexToHsl(customThemeColor);

    const handleNavClick = (viewId: string) => {
        onViewChange(viewId);
        if (isMobile)
            setMobileOpen(false);
    };
    const handleCustomThemeHueChange = (_event: Event, value: number | number[]) => {
        const hue = Array.isArray(value) ? value[0] : value;
        setCustomThemeColor(hslToHex(hue, customThemeHsl.s, customThemeHsl.l));
    };
    const handleCustomThemeSaturationChange = (_event: Event, value: number | number[]) => {
        const saturation = Array.isArray(value) ? value[0] : value;
        setCustomThemeColor(hslToHex(customThemeHsl.h, saturation, customThemeHsl.l));
    };
    const handleCustomThemeLightnessChange = (_event: Event, value: number | number[]) => {
        const lightness = Array.isArray(value) ? value[0] : value;
        setCustomThemeColor(hslToHex(customThemeHsl.h, customThemeHsl.s, lightness));
    };
    const handleCustomThemeHexInput = (value: string) => {
        if (/^#?[0-9a-fA-F]{0,6}$/.test(value)) {
            const normalized = value.startsWith('#') ? value : `#${value}`;
            if (normalized.length === 7) {
                setCustomThemeColor(normalized);
            }
        }
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
                    v{appVersion}
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

            
            <Menu anchorEl={paletteAnchor} open={Boolean(paletteAnchor)} onClose={() => setPaletteAnchor(null)} slotProps={{ paper: { sx: { minWidth: 220, borderRadius: '14px' } } }} transformOrigin={{ vertical: 'bottom', horizontal: 'left' }} anchorOrigin={{ vertical: 'top', horizontal: 'left' }}>
                {themes.map((t) => (<MenuItem key={t.id} onClick={() => { setThemeById(t.id); setPaletteAnchor(null); }} sx={{ gap: 1.5, borderRadius: '10px', mx: 0.5, my: 0.25, fontSize: '0.82rem' }}>
                        
                        <Box sx={{
                width: 14, height: 14, borderRadius: '50%', flexShrink: 0,
                background: `linear-gradient(135deg, ${t.primary}, ${t.secondary})`,
                boxShadow: `0 2px 6px ${alpha(t.primary, 0.5)}`,
            }}/>
                        {t.name}
                        {appTheme.id === t.id && (<CheckIcon sx={{ fontSize: 14, ml: 'auto', color: 'primary.main' }}/>)}
                    </MenuItem>))}
                <Divider sx={{ mx: 1, my: 0.5, borderColor: alpha(appTheme.primary, 0.18) }}/>
                <MenuItem onClick={() => {
                setPaletteAnchor(null);
                setThemeById('custom');
                setCustomThemeDialogOpen(true);
            }} sx={{ gap: 1.5, borderRadius: '10px', mx: 0.5, my: 0.25, fontSize: '0.82rem' }}>
                    <Box sx={{
                width: 14,
                height: 14,
                borderRadius: '50%',
                flexShrink: 0,
                background: `linear-gradient(135deg, ${customThemeColor}, ${alpha(customThemeColor, 0.46)})`,
                boxShadow: `0 2px 6px ${alpha(customThemeColor, 0.42)}`,
            }}/>
                    Custom Theme
                    <CustomThemeIcon sx={{ fontSize: 15, ml: 'auto', color: 'text.secondary' }}/>
                </MenuItem>
            </Menu>
            <Dialog open={customThemeDialogOpen} onClose={() => setCustomThemeDialogOpen(false)} maxWidth="xs" fullWidth slotProps={{ paper: { sx: {
            borderRadius: '22px',
            border: `1px solid ${alpha(appTheme.primary, 0.18)}`,
            backgroundImage: `linear-gradient(180deg, ${alpha(appTheme.primary, 0.08)} 0%, ${alpha(appTheme.bgPaper, 0.98)} 30%, ${appTheme.bgPaper} 100%)`,
        } } }}>
                <DialogTitle sx={{ pb: 1 }}>
                    <Typography sx={{ fontSize: '1rem', fontWeight: 700 }}>
                        Custom Theme
                    </Typography>
                    <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary', mt: 0.35 }}>
                        Build a theme from one accent color.
                    </Typography>
                </DialogTitle>
                <DialogContent sx={{ pt: '8px !important', pb: 2 }}>
                    <Box sx={{
                p: 1.25,
                borderRadius: '16px',
                border: `1px solid ${alpha(appTheme.primary, 0.16)}`,
                background: `linear-gradient(180deg, ${alpha(appTheme.primary, 0.08)} 0%, ${alpha('#000000', 0.08)} 100%)`,
            }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 1.25 }}>
                            <IconButton size="small" onClick={() => {
                    setThemeById('custom');
                }} sx={{
                    width: 34,
                    height: 34,
                    borderRadius: '12px',
                    background: `linear-gradient(135deg, ${customThemeColor}, ${alpha(customThemeColor, 0.48)})`,
                    border: `1px solid ${alpha(customThemeColor, 0.42)}`,
                    color: '#ffffff',
                    flexShrink: 0,
                }}>
                                <CustomThemeIcon sx={{ fontSize: 16 }}/>
                            </IconButton>
                            <InputBase value={customThemeColor.toUpperCase()} onChange={(event) => {
                    handleCustomThemeHexInput(event.target.value);
                }} sx={{
                    px: 1.25,
                    py: 0.45,
                    flex: 1,
                    borderRadius: '10px',
                    border: `1px solid ${alpha('#ffffff', 0.12)}`,
                    backgroundColor: alpha('#000000', 0.18),
                    fontSize: '0.76rem',
                    fontWeight: 700,
                    letterSpacing: '0.06em',
                    fontFamily: '"JetBrains Mono", monospace',
                }}/>
                        </Box>

                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            <Box>
                                <Typography sx={{ fontSize: '0.68rem', color: 'text.secondary', mb: 0.45 }}>
                                    Hue
                                </Typography>
                                <Slider value={customThemeHsl.h} min={0} max={360} onChange={handleCustomThemeHueChange} sx={{
                    color: 'transparent',
                    height: 8,
                    '& .MuiSlider-rail': {
                        opacity: 1,
                        background: 'linear-gradient(90deg, #ff3b30 0%, #ff9500 16%, #ffcc00 33%, #34c759 50%, #0a84ff 66%, #5856d6 82%, #ff2d55 100%)',
                    },
                    '& .MuiSlider-track': {
                        display: 'none',
                    },
                    '& .MuiSlider-thumb': {
                        width: 14,
                        height: 14,
                        backgroundColor: customThemeColor,
                        border: '2px solid #ffffff',
                        boxShadow: `0 0 0 4px ${alpha(customThemeColor, 0.16)}`,
                    },
                }}/>
                            </Box>

                            <Box>
                                <Typography sx={{ fontSize: '0.68rem', color: 'text.secondary', mb: 0.45 }}>
                                    Saturation
                                </Typography>
                                <Slider value={customThemeHsl.s} min={0} max={100} onChange={handleCustomThemeSaturationChange} sx={{
                    color: 'transparent',
                    height: 8,
                    '& .MuiSlider-rail': {
                        opacity: 1,
                        background: `linear-gradient(90deg, ${hslToHex(customThemeHsl.h, 0, customThemeHsl.l)} 0%, ${hslToHex(customThemeHsl.h, 100, customThemeHsl.l)} 100%)`,
                    },
                    '& .MuiSlider-track': {
                        display: 'none',
                    },
                    '& .MuiSlider-thumb': {
                        width: 14,
                        height: 14,
                        backgroundColor: customThemeColor,
                        border: '2px solid #ffffff',
                        boxShadow: `0 0 0 4px ${alpha(customThemeColor, 0.16)}`,
                    },
                }}/>
                            </Box>

                            <Box>
                                <Typography sx={{ fontSize: '0.68rem', color: 'text.secondary', mb: 0.45 }}>
                                    Lightness
                                </Typography>
                                <Slider value={customThemeHsl.l} min={18} max={72} onChange={handleCustomThemeLightnessChange} sx={{
                    color: 'transparent',
                    height: 8,
                    '& .MuiSlider-rail': {
                        opacity: 1,
                        background: `linear-gradient(90deg, #0f1115 0%, ${hslToHex(customThemeHsl.h, customThemeHsl.s, 50)} 52%, #f4f5f8 100%)`,
                    },
                    '& .MuiSlider-track': {
                        display: 'none',
                    },
                    '& .MuiSlider-thumb': {
                        width: 14,
                        height: 14,
                        backgroundColor: customThemeColor,
                        border: '2px solid #ffffff',
                        boxShadow: `0 0 0 4px ${alpha(customThemeColor, 0.16)}`,
                    },
                }}/>
                            </Box>
                        </Box>
                    </Box>
                </DialogContent>
            </Dialog>

            
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
