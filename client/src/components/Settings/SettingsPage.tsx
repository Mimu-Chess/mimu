import { useState } from 'react';
import type { ReactNode } from 'react';
import {
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    Divider,
    Fade,
    FormControl,
    IconButton,
    InputLabel,
    MenuItem,
    Select,
    Switch,
    ToggleButton,
    ToggleButtonGroup,
    Tooltip,
    Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
    AutoAwesome as MotionIcon,
    BrushRounded as ThemeIcon,
    SpaceDashboardRounded as LayoutIcon,
    SportsEsportsRounded as BoardIcon,
    TuneRounded as GeneralIcon,
    Tune as CustomThemeIcon,
} from '@mui/icons-material';
import { useAppTheme } from '../../context/ThemeContext';
import { useAppSettings } from '../../context/SettingsContext';
import { PIECE_SET_OPTIONS } from '../../lib/pieceSetCatalog';
import { CustomThemeDialog } from '../Theme/CustomThemeDialog';

type SettingsCategoryId = 'general' | 'board' | 'layout' | 'theme';

function SectionHeader({
    icon,
    eyebrow,
    title,
    subtitle,
}: {
    icon: ReactNode;
    eyebrow: string;
    title: string;
    subtitle: string;
}) {
    return (
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mb: 2 }}>
            <Box
                sx={{
                    width: 42,
                    height: 42,
                    borderRadius: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'primary.main',
                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.12),
                    border: (theme) => `1px solid ${alpha(theme.palette.primary.main, 0.16)}`,
                    boxShadow: (theme) => `0 10px 24px ${alpha(theme.palette.primary.main, 0.12)}`,
                    flexShrink: 0,
                }}
            >
                {icon}
            </Box>
            <Box sx={{ minWidth: 0 }}>
                <Typography
                    variant="caption"
                    sx={{
                        display: 'block',
                        textTransform: 'uppercase',
                        letterSpacing: '0.14em',
                        color: 'text.secondary',
                        mb: 0.5,
                    }}
                >
                    {eyebrow}
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.15 }}>
                    {title}
                </Typography>
                <Typography
                    variant="body2"
                    sx={{ color: 'text.secondary', mt: 0.75, lineHeight: 1.7, maxWidth: 560 }}
                >
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
    divider = true,
}: {
    label: string;
    description: string;
    control: ReactNode;
    divider?: boolean;
}) {
    return (
        <>
            <Box
                sx={{
                    display: 'flex',
                    alignItems: { xs: 'flex-start', md: 'center' },
                    justifyContent: 'space-between',
                    gap: 2,
                    py: 1.75,
                    flexDirection: { xs: 'column', md: 'row' },
                }}
            >
                <Box sx={{ minWidth: 0, maxWidth: 520 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        {label}
                    </Typography>
                    <Typography
                        variant="caption"
                        sx={{ color: 'text.secondary', display: 'block', mt: 0.5, lineHeight: 1.7 }}
                    >
                        {description}
                    </Typography>
                </Box>
                <Box sx={{ flexShrink: 0, width: { xs: '100%', md: 'auto' } }}>
                    {control}
                </Box>
            </Box>
            {divider && <Divider />}
        </>
    );
}

function SettingsSection({
    eyebrow,
    title,
    subtitle,
    icon,
    children,
}: {
    eyebrow: string;
    title: string;
    subtitle: string;
    icon: ReactNode;
    children: ReactNode;
}) {
    return (
        <Card
            sx={{
                bgcolor: 'background.paper',
                borderRadius: '24px',
                boxShadow: (theme) => `0 20px 50px ${alpha(theme.palette.common.black, 0.10)}`,
            }}
        >
            <CardContent sx={{ p: { xs: 2.25, md: 3 } }}>
                <SectionHeader icon={icon} eyebrow={eyebrow} title={title} subtitle={subtitle} />
                {children}
            </CardContent>
        </Card>
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
    const [activeCategory, setActiveCategory] = useState<SettingsCategoryId>('general');
    const settingsText = strings.settings;

    const categories: Array<{
        id: SettingsCategoryId;
        label: string;
        title: string;
        subtitle: string;
        icon: ReactNode;
    }> = [
        {
            id: 'general',
            label: settingsText.appearanceTitle,
            title: settingsText.appearanceTitle,
            subtitle: settingsText.appearanceSubtitle,
            icon: <GeneralIcon sx={{ fontSize: 18 }} />,
        },
        {
            id: 'board',
            label: settingsText.boardTitle,
            title: settingsText.boardTitle,
            subtitle: settingsText.boardSubtitle,
            icon: <BoardIcon sx={{ fontSize: 18 }} />,
        },
        {
            id: 'layout',
            label: settingsText.layoutTitle,
            title: settingsText.layoutTitle,
            subtitle: settingsText.layoutSubtitle,
            icon: <LayoutIcon sx={{ fontSize: 18 }} />,
        },
        {
            id: 'theme',
            label: settingsText.themeTitle,
            title: settingsText.themeTitle,
            subtitle: settingsText.themeSubtitle,
            icon: <ThemeIcon sx={{ fontSize: 18 }} />,
        },
    ];

    const activeCategoryMeta = categories.find((category) => category.id === activeCategory) ?? categories[0];

    return (
        <Box
            sx={{
                maxWidth: 980,
                mx: 'auto',
                pb: 5,
                px: { xs: 0.5, md: 1 },
            }}
        >
            <Box
                sx={{
                    position: 'sticky',
                    top: { xs: 12, md: 18 },
                    zIndex: 20,
                    display: 'flex',
                    justifyContent: 'center',
                    pt: { xs: 1, md: 1.5 },
                    pb: 1.75,
                }}
            >
                <Box
                    sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: { xs: 0.25, md: 0.4 },
                        px: { xs: 0.5, md: 0.65 },
                        py: 0.35,
                        minHeight: 42,
                        borderRadius: '999px',
                        bgcolor: (theme) => alpha(theme.palette.background.paper, 0.72),
                        border: (theme) => `1px solid ${alpha(theme.palette.primary.main, 0.16)}`,
                        backdropFilter: 'blur(18px) saturate(140%)',
                        boxShadow: (theme) => `0 14px 28px ${alpha(theme.palette.common.black, 0.16)}`,
                    }}
                >
                    {categories.map((category) => {
                        const selected = category.id === activeCategory;
                        return (
                            <Tooltip key={category.id} title={category.label}>
                                <IconButton
                                    onClick={() => setActiveCategory(category.id)}
                                    size="small"
                                    sx={{
                                        width: { xs: 30, md: 34 },
                                        height: { xs: 30, md: 34 },
                                        color: selected ? 'primary.main' : 'text.secondary',
                                        bgcolor: selected
                                            ? (theme) => alpha(theme.palette.primary.main, 0.14)
                                            : 'transparent',
                                        position: 'relative',
                                        transition: 'transform 0.18s ease, color 0.18s ease, background-color 0.18s ease, box-shadow 0.18s ease',
                                        '&:hover': {
                                            transform: 'scale(1.06)',
                                            color: 'primary.main',
                                            bgcolor: (theme) => alpha(theme.palette.primary.main, 0.12),
                                        },
                                        '&::after': selected
                                            ? {
                                                content: '""',
                                                position: 'absolute',
                                                bottom: 3,
                                                left: '50%',
                                                transform: 'translateX(-50%)',
                                                width: 12,
                                                height: 2,
                                                borderRadius: 99,
                                                bgcolor: 'primary.main',
                                                boxShadow: (theme) => `0 0 12px ${alpha(theme.palette.primary.main, 0.75)}`,
                                            }
                                            : undefined,
                                    }}
                                >
                                    <Box sx={{ '& .MuiSvgIcon-root': { fontSize: { xs: 15, md: 17 } } }}>
                                        {category.icon}
                                    </Box>
                                </IconButton>
                            </Tooltip>
                        );
                    })}
                </Box>
            </Box>

            <Box sx={{ textAlign: 'center', mb: 3.5, mt: 1.25, px: { xs: 1, md: 4 } }}>
                <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: '-0.03em' }}>
                    {settingsText.title}
                </Typography>
                <Typography
                    variant="body2"
                    sx={{
                        color: 'text.secondary',
                        mt: 1,
                        mx: 'auto',
                        maxWidth: 620,
                        lineHeight: 1.75,
                    }}
                >
                    {settingsText.subtitle}
                </Typography>
                <Chip
                    size="small"
                    label={activeCategoryMeta.label}
                    sx={{
                        mt: 1.75,
                        borderRadius: 99,
                        px: 0.5,
                        bgcolor: (theme) => alpha(theme.palette.primary.main, 0.10),
                        color: 'primary.main',
                    }}
                />
            </Box>

            <Fade in key={activeCategory} timeout={260}>
                <Box
                    sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 2,
                        animation: 'settingsSlideIn 260ms ease',
                        '@keyframes settingsSlideIn': {
                            from: {
                                opacity: 0,
                                transform: 'translateY(10px)',
                            },
                            to: {
                                opacity: 1,
                                transform: 'translateY(0)',
                            },
                        },
                    }}
                >
                    {activeCategory === 'general' && (
                        <>
                            <SettingsSection
                                eyebrow={settingsText.title}
                                title={settingsText.appearanceTitle}
                                subtitle={settingsText.appearanceSubtitle}
                                icon={<GeneralIcon sx={{ fontSize: 18 }} />}
                            >
                                <SettingRow
                                    label={settingsText.colorModeLabel}
                                    description={settingsText.colorModeDescription}
                                    control={(
                                        <ToggleButtonGroup
                                            value={colorMode}
                                            exclusive
                                            size="small"
                                            onChange={(_, value) => value && setColorMode(value)}
                                            sx={{
                                                minWidth: 210,
                                                bgcolor: (theme) => alpha(theme.palette.primary.main, 0.05),
                                            }}
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
                                    divider={false}
                                    control={(
                                        <FormControl size="small" sx={{ minWidth: { xs: '100%', md: 220 } }}>
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
                            </SettingsSection>
                        </>
                    )}

                    {activeCategory === 'board' && (
                        <SettingsSection
                            eyebrow={settingsText.title}
                            title={settingsText.boardTitle}
                            subtitle={settingsText.boardSubtitle}
                            icon={<BoardIcon sx={{ fontSize: 18 }} />}
                        >
                            <SettingRow
                                label={settingsText.pieceSetLabel}
                                description={settingsText.pieceSetDescription}
                                control={(
                                    <FormControl size="small" sx={{ minWidth: { xs: '100%', md: 220 } }}>
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
                        </SettingsSection>
                    )}

                    {activeCategory === 'layout' && (
                        <SettingsSection
                            eyebrow={settingsText.title}
                            title={settingsText.layoutTitle}
                            subtitle={settingsText.layoutSubtitle}
                            icon={<LayoutIcon sx={{ fontSize: 18 }} />}
                        >
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
                        </SettingsSection>
                    )}

                    {activeCategory === 'theme' && (
                        <>
                            <SettingsSection
                                eyebrow={settingsText.title}
                                title={settingsText.themeTitle}
                                subtitle={settingsText.themeSubtitle}
                                icon={<ThemeIcon sx={{ fontSize: 18 }} />}
                            >
                                <Box
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        gap: 2,
                                        mb: 2.25,
                                        flexWrap: 'wrap',
                                    }}
                                >
                                    <Box>
                                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                            {appTheme.name}
                                        </Typography>
                                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.4 }}>
                                            {settingsText.activeThemeLabel}
                                        </Typography>
                                    </Box>
                                    <Chip
                                        size="small"
                                        label={appTheme.id === 'custom' ? settingsText.customButton : appTheme.name}
                                        color="secondary"
                                        variant="outlined"
                                        sx={{ height: 26, fontSize: '0.72rem' }}
                                    />
                                </Box>

                                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                    {themes.filter((theme) => theme.id !== 'custom').map((theme) => (
                                        <Tooltip key={theme.id} title={theme.name}>
                                            <Box
                                                onClick={() => setThemeById(theme.id)}
                                                sx={{
                                                    width: 52,
                                                    height: 52,
                                                    borderRadius: '18px',
                                                    cursor: 'pointer',
                                                    overflow: 'hidden',
                                                    border: '2px solid',
                                                    borderColor: appTheme.id === theme.id ? 'primary.main' : 'transparent',
                                                    display: 'flex',
                                                    transition: 'transform 0.16s ease, border-color 0.16s ease, box-shadow 0.16s ease',
                                                    boxShadow: appTheme.id === theme.id
                                                        ? (themeObject) => `0 12px 24px ${alpha(themeObject.palette.primary.main, 0.22)}`
                                                        : 'none',
                                                    '&:hover': {
                                                        transform: 'translateY(-2px)',
                                                        borderColor: 'primary.light',
                                                    },
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
                                        sx={{
                                            minHeight: 52,
                                            px: 1.75,
                                            borderRadius: '18px',
                                        }}
                                    >
                                        {settingsText.customButton}
                                    </Button>
                                </Box>
                            </SettingsSection>

                            <Card
                                sx={{
                                    bgcolor: (theme) => alpha(theme.palette.background.paper, 0.55),
                                    borderRadius: '24px',
                                    backdropFilter: 'blur(12px)',
                                }}
                            >
                                <CardContent sx={{ p: { xs: 2.25, md: 2.5 } }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 1.25 }}>
                                        <MotionIcon sx={{ color: 'primary.main', fontSize: 18 }} />
                                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                                            {settingsText.themePreviewLabel}
                                        </Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                        <Chip size="small" label={`Light ${appTheme.boardLight}`} variant="outlined" />
                                        <Chip size="small" label={`Dark ${appTheme.boardDark}`} variant="outlined" />
                                        <Chip size="small" label={`Accent ${appTheme.primary}`} variant="outlined" />
                                    </Box>
                                </CardContent>
                            </Card>
                        </>
                    )}
                </Box>
            </Fade>

            <CustomThemeDialog open={customThemeDialogOpen} onClose={() => setCustomThemeDialogOpen(false)} />
        </Box>
    );
}
