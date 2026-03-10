import { createTheme } from '@mui/material/styles';
const theme = createTheme({
    palette: {
        mode: 'dark',
        primary: {
            main: '#7c4dff',
            light: '#b388ff',
            dark: '#651fff',
        },
        secondary: {
            main: '#00e5ff',
            light: '#6effff',
            dark: '#00b8d4',
        },
        background: {
            default: '#0a0e1a',
            paper: '#111827',
        },
        text: {
            primary: '#e2e8f0',
            secondary: '#94a3b8',
        },
        divider: 'rgba(148, 163, 184, 0.12)',
        error: {
            main: '#ff5252',
        },
        success: {
            main: '#69f0ae',
        },
        warning: {
            main: '#ffd740',
        },
    },
    typography: {
        fontFamily: '"Inter", "Roboto", "Helvetica Neue", Arial, sans-serif',
        h4: {
            fontWeight: 700,
            letterSpacing: '-0.02em',
        },
        h5: {
            fontWeight: 600,
            letterSpacing: '-0.01em',
        },
        h6: {
            fontWeight: 600,
        },
        subtitle1: {
            fontWeight: 500,
        },
        button: {
            textTransform: 'none',
            fontWeight: 600,
        },
    },
    shape: {
        borderRadius: 12,
    },
    components: {
        MuiButton: {
            styleOverrides: {
                root: {
                    borderRadius: 10,
                    padding: '8px 20px',
                    transition: 'all 0.2s ease-in-out',
                },
                contained: {
                    boxShadow: '0 4px 14px 0 rgba(124, 77, 255, 0.25)',
                    '&:hover': {
                        boxShadow: '0 6px 20px 0 rgba(124, 77, 255, 0.35)',
                        transform: 'translateY(-1px)',
                    },
                },
            },
        },
        MuiCard: {
            styleOverrides: {
                root: {
                    borderRadius: 16,
                    border: '1px solid rgba(148, 163, 184, 0.08)',
                    backgroundImage: 'none',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                        border: '1px solid rgba(124, 77, 255, 0.2)',
                    },
                },
            },
        },
        MuiDrawer: {
            styleOverrides: {
                paper: {
                    borderRight: '1px solid rgba(148, 163, 184, 0.08)',
                    backgroundImage: 'none',
                },
            },
        },
        MuiAppBar: {
            styleOverrides: {
                root: {
                    backgroundImage: 'none',
                    borderBottom: '1px solid rgba(148, 163, 184, 0.08)',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.3)',
                },
            },
        },
        MuiDialog: {
            styleOverrides: {
                paper: {
                    borderRadius: 16,
                    border: '1px solid rgba(148, 163, 184, 0.08)',
                    backgroundImage: 'none',
                },
            },
        },
        MuiTableCell: {
            styleOverrides: {
                root: {
                    borderBottom: '1px solid rgba(148, 163, 184, 0.08)',
                },
            },
        },
        MuiChip: {
            styleOverrides: {
                root: {
                    borderRadius: 8,
                },
            },
        },
        MuiListItemButton: {
            styleOverrides: {
                root: {
                    borderRadius: 10,
                    margin: '2px 8px',
                    '&.Mui-selected': {
                        backgroundColor: 'rgba(124, 77, 255, 0.15)',
                        '&:hover': {
                            backgroundColor: 'rgba(124, 77, 255, 0.25)',
                        },
                    },
                },
            },
        },
    },
});
export default theme;
