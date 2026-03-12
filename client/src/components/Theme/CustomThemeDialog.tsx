import { Box, Dialog, DialogContent, DialogTitle, IconButton, InputBase, Slider, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Tune as CustomThemeIcon } from '@mui/icons-material';
import { useAppTheme } from '../../context/ThemeContext';
import { useAppSettings } from '../../context/SettingsContext';

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

export function CustomThemeDialog({
    open,
    onClose,
}: {
    open: boolean;
    onClose: () => void;
}) {
    const { appTheme, customThemeColor, setThemeById, setCustomThemeColor } = useAppTheme();
    const { strings } = useAppSettings();
    const customThemeHsl = hexToHsl(customThemeColor);

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

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="xs"
            fullWidth
            slotProps={{
                paper: {
                    sx: {
                        borderRadius: '22px',
                        border: `1px solid ${alpha(appTheme.primary, 0.18)}`,
                        backgroundImage: `linear-gradient(180deg, ${alpha(appTheme.primary, 0.08)} 0%, ${alpha(appTheme.bgPaper, 0.98)} 30%, ${appTheme.bgPaper} 100%)`,
                    },
                },
            }}
        >
            <DialogTitle sx={{ pb: 1 }}>
                <Typography sx={{ fontSize: '1rem', fontWeight: 700 }}>
                    {strings.customTheme.title}
                </Typography>
                <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary', mt: 0.35 }}>
                    {strings.customTheme.subtitle}
                </Typography>
            </DialogTitle>
            <DialogContent sx={{ pt: '8px !important', pb: 2 }}>
                <Box
                    sx={{
                        p: 1.25,
                        borderRadius: '16px',
                        border: `1px solid ${alpha(appTheme.primary, 0.16)}`,
                        background: `linear-gradient(180deg, ${alpha(appTheme.primary, 0.08)} 0%, ${alpha('#000000', 0.08)} 100%)`,
                    }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 1.25 }}>
                        <IconButton
                            size="small"
                            onClick={() => setThemeById('custom')}
                            sx={{
                                width: 34,
                                height: 34,
                                borderRadius: '12px',
                                background: `linear-gradient(135deg, ${customThemeColor}, ${alpha(customThemeColor, 0.48)})`,
                                border: `1px solid ${alpha(customThemeColor, 0.42)}`,
                                color: '#ffffff',
                                flexShrink: 0,
                            }}
                        >
                            <CustomThemeIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                        <InputBase
                            value={customThemeColor.toUpperCase()}
                            onChange={(event) => handleCustomThemeHexInput(event.target.value)}
                            sx={{
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
                            }}
                        />
                    </Box>

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <Box>
                            <Typography sx={{ fontSize: '0.68rem', color: 'text.secondary', mb: 0.45 }}>
                                {strings.customTheme.hue}
                            </Typography>
                            <Slider
                                value={customThemeHsl.h}
                                min={0}
                                max={360}
                                onChange={handleCustomThemeHueChange}
                                sx={{
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
                                }}
                            />
                        </Box>

                        <Box>
                            <Typography sx={{ fontSize: '0.68rem', color: 'text.secondary', mb: 0.45 }}>
                                {strings.customTheme.saturation}
                            </Typography>
                            <Slider
                                value={customThemeHsl.s}
                                min={0}
                                max={100}
                                onChange={handleCustomThemeSaturationChange}
                                sx={{
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
                                }}
                            />
                        </Box>

                        <Box>
                            <Typography sx={{ fontSize: '0.68rem', color: 'text.secondary', mb: 0.45 }}>
                                {strings.customTheme.lightness}
                            </Typography>
                            <Slider
                                value={customThemeHsl.l}
                                min={18}
                                max={72}
                                onChange={handleCustomThemeLightnessChange}
                                sx={{
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
                                }}
                            />
                        </Box>
                    </Box>
                </Box>
            </DialogContent>
        </Dialog>
    );
}
