import { Box, CircularProgress, useTheme } from '@mui/material';

export function DesktopSplash() {
    const theme = useTheme();

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
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                animation: 'fadeIn 0.3s ease-out',
                '@keyframes fadeIn': {
                    from: { opacity: 0 },
                    to: { opacity: 1 },
                },
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

            <CircularProgress
                size={40}
                thickness={4}
                sx={{
                    color: theme.palette.primary.main,
                    mb: 3,
                    filter: `drop-shadow(0 0 8px ${theme.palette.primary.main}60)`,
                }}
            />
        </Box>
    );
}
