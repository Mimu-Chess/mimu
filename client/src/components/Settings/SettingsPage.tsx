import { useState } from 'react';
import type { ReactNode } from 'react';
import {
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    Divider,
    FormControl,
    IconButton,
    InputLabel,
    MenuItem,
    Select,
    Tooltip,
    ToggleButton,
    ToggleButtonGroup,
    Typography,
    Switch,
} from '@mui/material';
import {
    AutoAwesome as MotionIcon,
    Palette as ThemeIcon,
    SettingsBrightness as AppearanceIcon,
    SpaceDashboard as LayoutIcon,
    Tune as CustomThemeIcon,
} from '@mui/icons-material';
import { useAppTheme } from '../../context/ThemeContext';
import { useAppSettings } from '../../context/SettingsContext';
import { PIECE_SET_OPTIONS } from '../../lib/pieceSetCatalog';
import { CustomThemeDialog } from '../Theme/CustomThemeDialog';

function SectionHeader({
    icon,
    title,
    subtitle,
}: {
    icon: ReactNode;
    title: string;
    subtitle: string;
}) {
    return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <IconButton size="small" disableRipple sx={{ color: 'primary.main', bgcolor: 'action.hover' }}>
                {icon}
            </IconButton>
            <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    {title}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {subtitle}
                </Typography>
            </Box>
        </Box>
    );
}

function SettingRow({
    label,
    description,
    control,
    note,
    divider = true,
}: {
    label: string;
    description: string;
    control: ReactNode;
    note?: string;
    divider?: boolean;
}) {
    return (
        <>
            <Box
                sx={{
                    display: 'flex',
                    alignItems: { xs: 'flex-start', sm: 'center' },
                    justifyContent: 'space-between',
                    gap: 2,
                    py: 1.5,
                }}
            >
                <Box sx={{ minWidth: 0, pr: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {label}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.35, lineHeight: 1.6 }}>
                        {description}
                    </Typography>
                    {note && (
                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.65 }}>
                            {note}
                        </Typography>
                    )}
                </Box>
                <Box sx={{ flexShrink: 0 }}>
                    {control}
                </Box>
            </Box>
            {divider && <Divider />}
        </>
    );
}

export default function SettingsPage() {
    const { appTheme, themes, setThemeById } = useAppTheme();
    const {
        colorMode,
        language,
        languageOptions,
        animationsEnabled,
        showBoardCoordinates,
        pieceSet,
        moveSoundsEnabled,
        compactSidebar,
        rememberLastView,
        setColorMode,
        setLanguage,
        setAnimationsEnabled,
        setShowBoardCoordinates,
        setPieceSet,
        setMoveSoundsEnabled,
        setCompactSidebar,
        setRememberLastView,
        strings,
    } = useAppSettings();
    const [customThemeDialogOpen, setCustomThemeDialogOpen] = useState(false);
    const settingsText = strings.settings;

    return (
        <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    {settingsText.title}
                </Typography>
            </Box>
            <Typography variant="caption" sx={{ color: 'text.secondary', mb: 2, display: 'block' }}>
                {settingsText.subtitle}
            </Typography>

            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                <Box sx={{ flex: '1 1 520px', minWidth: 320, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Card sx={{ bgcolor: 'background.paper' }}>
                        <CardContent sx={{ p: 2.5 }}>
                            <SectionHeader
                                icon={<AppearanceIcon sx={{ fontSize: 18 }} />}
                                title={settingsText.appearanceTitle}
                                subtitle={settingsText.appearanceSubtitle}
                            />
                            <SettingRow
                                label={settingsText.colorModeLabel}
                                description={settingsText.colorModeDescription}
                                control={(
                                    <ToggleButtonGroup
                                        value={colorMode}
                                        exclusive
                                        size="small"
                                        onChange={(_, value) => value && setColorMode(value)}
                                        sx={{ minWidth: 190 }}
                                    >
                                        <ToggleButton value="light" sx={{ textTransform: 'none', fontSize: '0.8rem' }}>
                                            {settingsText.lightModeLabel}
                                        </ToggleButton>
                                        <ToggleButton value="dark" sx={{ textTransform: 'none', fontSize: '0.8rem' }}>
                                            {settingsText.darkModeLabel}
                                        </ToggleButton>
                                    </ToggleButtonGroup>
                                )}
                            />
                            <SettingRow
                                label={settingsText.languageLabel}
                                description={settingsText.languageDescription}
                                note={settingsText.languageNote}
                                divider={false}
                                control={(
                                    <FormControl size="small" sx={{ minWidth: 190 }}>
                                        <InputLabel>{settingsText.languageLabel}</InputLabel>
                                        <Select
                                            value={language}
                                            label={settingsText.languageLabel}
                                            onChange={(event) => setLanguage(event.target.value as typeof language)}
                                        >
                                            {languageOptions.map((option) => (
                                                <MenuItem key={option.value} value={option.value}>
                                                    {option.label}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                )}
                            />
                        </CardContent>
                    </Card>

                    <Card sx={{ bgcolor: 'background.paper' }}>
                        <CardContent sx={{ p: 2.5 }}>
                            <SectionHeader
                                icon={<MotionIcon sx={{ fontSize: 18 }} />}
                                title={settingsText.boardTitle}
                                subtitle={settingsText.boardSubtitle}
                            />
                            <SettingRow
                                label={settingsText.pieceSetLabel}
                                description={settingsText.pieceSetDescription}
                                control={(
                                    <FormControl size="small" sx={{ minWidth: 190 }}>
                                        <InputLabel>{settingsText.pieceSetLabel}</InputLabel>
                                        <Select
                                            value={pieceSet}
                                            label={settingsText.pieceSetLabel}
                                            onChange={(event) => setPieceSet(event.target.value as typeof pieceSet)}
                                        >
                                            {PIECE_SET_OPTIONS.map((option) => (
                                                <MenuItem key={option.id} value={option.id}>
                                                    {option.label}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                )}
                            />
                            <SettingRow
                                label={settingsText.soundsLabel}
                                description={settingsText.soundsDescription}
                                control={(
                                    <Switch
                                        checked={moveSoundsEnabled}
                                        onChange={(event) => setMoveSoundsEnabled(event.target.checked)}
                                    />
                                )}
                            />
                            <SettingRow
                                label={settingsText.animationsLabel}
                                description={settingsText.animationsDescription}
                                control={(
                                    <Switch
                                        checked={animationsEnabled}
                                        onChange={(event) => setAnimationsEnabled(event.target.checked)}
                                    />
                                )}
                            />
                            <SettingRow
                                label={settingsText.coordinatesLabel}
                                description={settingsText.coordinatesDescription}
                                divider={false}
                                control={(
                                    <Switch
                                        checked={showBoardCoordinates}
                                        onChange={(event) => setShowBoardCoordinates(event.target.checked)}
                                    />
                                )}
                            />
                        </CardContent>
                    </Card>
                </Box>

                <Box sx={{ flex: '1 1 420px', minWidth: 320, display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 620 }}>
                    <Card sx={{ bgcolor: 'background.paper' }}>
                        <CardContent sx={{ p: 2.5 }}>
                            <SectionHeader
                                icon={<LayoutIcon sx={{ fontSize: 18 }} />}
                                title={settingsText.layoutTitle}
                                subtitle={settingsText.layoutSubtitle}
                            />
                            <SettingRow
                                label={settingsText.compactSidebarLabel}
                                description={settingsText.compactSidebarDescription}
                                control={(
                                    <Switch
                                        checked={compactSidebar}
                                        onChange={(event) => setCompactSidebar(event.target.checked)}
                                    />
                                )}
                            />
                            <SettingRow
                                label={settingsText.rememberViewLabel}
                                description={settingsText.rememberViewDescription}
                                divider={false}
                                control={(
                                    <Switch
                                        checked={rememberLastView}
                                        onChange={(event) => setRememberLastView(event.target.checked)}
                                    />
                                )}
                            />
                        </CardContent>
                    </Card>

                    <Card sx={{ bgcolor: 'background.paper' }}>
                        <CardContent sx={{ p: 2.5 }}>
                            <SectionHeader
                                icon={<ThemeIcon sx={{ fontSize: 18 }} />}
                                title={settingsText.themeTitle}
                                subtitle={settingsText.themeSubtitle}
                            />

                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.25 }}>
                                <Chip
                                    size="small"
                                    label={appTheme.name}
                                    color="secondary"
                                    variant="outlined"
                                    sx={{ height: 24, fontSize: '0.7rem' }}
                                />
                            </Box>

                            <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
                                {themes.filter((theme) => theme.id !== 'custom').map((theme) => (
                                    <Tooltip key={theme.id} title={theme.name}>
                                        <Box
                                            onClick={() => setThemeById(theme.id)}
                                            sx={{
                                                width: 34,
                                                height: 34,
                                                borderRadius: 1,
                                                cursor: 'pointer',
                                                overflow: 'hidden',
                                                border: appTheme.id === theme.id ? '2px solid' : '2px solid transparent',
                                                borderColor: appTheme.id === theme.id ? 'primary.main' : 'transparent',
                                                display: 'flex',
                                                transition: 'border-color 0.15s',
                                                '&:hover': { borderColor: 'primary.light' },
                                            }}
                                        >
                                            <Box sx={{ width: '50%', height: '100%', bgcolor: theme.boardLight }} />
                                            <Box sx={{ width: '50%', height: '100%', bgcolor: theme.boardDark }} />
                                        </Box>
                                    </Tooltip>
                                ))}
                                <Button
                                    size="small"
                                    variant={appTheme.id === 'custom' ? 'contained' : 'outlined'}
                                    startIcon={<CustomThemeIcon sx={{ fontSize: 16 }} />}
                                    onClick={() => {
                                        setThemeById('custom');
                                        setCustomThemeDialogOpen(true);
                                    }}
                                >
                                    {settingsText.customButton}
                                </Button>
                            </Box>
                        </CardContent>
                    </Card>
                </Box>
            </Box>
            <CustomThemeDialog open={customThemeDialogOpen} onClose={() => setCustomThemeDialogOpen(false)} />
        </Box>
    );
}
