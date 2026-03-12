import { Box, CircularProgress, useTheme } from '@mui/material';
import { useAppSettings } from '../../context/SettingsContext';

export function DesktopSplash() {
    const theme = useTheme();
    const { animationsEnabled } = useAppSettings();

    return (
        <Box
            sx={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 9999,
                backgroundColor: '#000000',
                backgroundImage: 'none',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                ...(animationsEnabled ? {
                    animation: 'fadeIn 0.3s ease-out',
                    '@keyframes fadeIn': {
                        from: { opacity: 0 },
                        to: { opacity: 1 },
                    },
                } : {}),
            }}
        >
            <Box
                sx={{
                    mb: 4,
                    width: 120,
                    height: 120,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                <img
                    src="MIMU.png"
                    alt="Mimu Chess Logo"
                    style={{
                        width: '100%',
                        height: 'auto',
                        objectFit: 'contain',
                    }}
                />
            </Box>

            {animationsEnabled ? (
                <CircularProgress
                    size={40}
                    thickness={4}
                    sx={{
                        color: theme.palette.primary.main,
                        mb: 3,
                        filter: `drop-shadow(0 0 8px ${theme.palette.primary.main}60)`,
                    }}
                />
            ) : (
                <Box
                    sx={{
                        width: 40,
                        height: 40,
                        mb: 3,
                        borderRadius: '50%',
                        border: `4px solid ${theme.palette.primary.main}`,
                        opacity: 0.9,
                        filter: `drop-shadow(0 0 8px ${theme.palette.primary.main}50)`,
                    }}
                />
            )}
        </Box>
    );
}
