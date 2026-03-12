import { useEffect, useMemo, useState } from 'react';
import { Box, Button, Paper, Portal, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { useAppSettings } from '../../context/SettingsContext';

type AppView = 'play' | 'match' | 'engines';
type Placement = 'top' | 'right' | 'bottom' | 'left' | 'center';

interface TourStep {
    id: string;
    title: string;
    body: string;
    view?: AppView;
    selector?: string;
    placement?: Placement;
}

interface FirstRunTourProps {
    open: boolean;
    activeView: string;
    onViewChange: (view: AppView) => void;
    onFinish: () => void;
}

const TOUR_STEP_META: Array<Omit<TourStep, 'title' | 'body'>> = [
    {
        id: 'welcome',
        placement: 'center',
    },
    {
        id: 'engines-nav',
        view: 'engines',
        selector: '[data-tour="nav-engines"]',
        placement: 'right',
    },
    {
        id: 'engines-add',
        view: 'engines',
        selector: '[data-tour="engines-add-button"]',
        placement: 'bottom',
    },
    {
        id: 'play-nav',
        view: 'play',
        selector: '[data-tour="nav-play"]',
        placement: 'right',
    },
    {
        id: 'play-setup',
        view: 'play',
        selector: '[data-tour="play-setup-card"]',
        placement: 'right',
    },
    {
        id: 'match-nav',
        view: 'match',
        selector: '[data-tour="nav-match"]',
        placement: 'right',
    },
    {
        id: 'match-setup',
        view: 'match',
        selector: '[data-tour="match-setup-card"]',
        placement: 'right',
    },
];

function clamp(value: number, min: number, max: number) {
    return Math.min(Math.max(value, min), max);
}

export function FirstRunTour({ open, activeView, onViewChange, onFinish }: FirstRunTourProps) {
    const theme = useTheme();
    const { strings } = useAppSettings();
    const [stepIndex, setStepIndex] = useState(0);
    const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
    const tourSteps = useMemo(() => TOUR_STEP_META.map((step, index) => ({
        ...step,
        title: strings.onboarding.steps[index].title,
        body: strings.onboarding.steps[index].body,
    })), [strings.onboarding.steps]);
    const currentStep = tourSteps[stepIndex];

    useEffect(() => {
        if (!open) {
            setStepIndex(0);
            setTargetRect(null);
        }
    }, [open]);

    useEffect(() => {
        if (!open || !currentStep?.view || currentStep.view === activeView) {
            return;
        }
        onViewChange(currentStep.view);
    }, [activeView, currentStep, onViewChange, open]);

    useEffect(() => {
        if (!open) {
            return;
        }

        let intervalId: number | undefined;

        const updateTarget = () => {
            if (!currentStep.selector) {
                setTargetRect(null);
                return;
            }
            const element = document.querySelector(currentStep.selector);
            setTargetRect(element instanceof HTMLElement ? element.getBoundingClientRect() : null);
        };

        updateTarget();
        intervalId = window.setInterval(updateTarget, 120);
        window.addEventListener('resize', updateTarget);
        window.addEventListener('scroll', updateTarget, true);

        return () => {
            if (intervalId) {
                window.clearInterval(intervalId);
            }
            window.removeEventListener('resize', updateTarget);
            window.removeEventListener('scroll', updateTarget, true);
        };
    }, [currentStep, open]);

    const panelGeometry = useMemo(() => {
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const panelWidth = Math.min(360, viewportWidth - 32);
        const panelHeight = 250;
        const margin = 16;

        if (!targetRect || currentStep.placement === 'center') {
            return {
                left: (viewportWidth - panelWidth) / 2,
                top: (viewportHeight - panelHeight) / 2,
                width: panelWidth,
            };
        }

        let left = (viewportWidth - panelWidth) / 2;
        let top = (viewportHeight - panelHeight) / 2;

        switch (currentStep.placement) {
            case 'top':
                left = targetRect.left + (targetRect.width - panelWidth) / 2;
                top = targetRect.top - panelHeight - 28;
                break;
            case 'right':
                left = targetRect.right + 28;
                top = targetRect.top + (targetRect.height - panelHeight) / 2;
                break;
            case 'left':
                left = targetRect.left - panelWidth - 28;
                top = targetRect.top + (targetRect.height - panelHeight) / 2;
                break;
            case 'bottom':
                left = targetRect.left + (targetRect.width - panelWidth) / 2;
                top = targetRect.bottom + 28;
                break;
            default:
                break;
        }

        return {
            left: clamp(left, margin, viewportWidth - panelWidth - margin),
            top: clamp(top, margin, viewportHeight - panelHeight - margin),
            width: panelWidth,
        };
    }, [currentStep.placement, targetRect]);

    const lineGeometry = useMemo(() => {
        if (!targetRect || currentStep.placement === 'center') {
            return null;
        }

        const panelCenterX = panelGeometry.left + panelGeometry.width / 2;
        const panelCenterY = panelGeometry.top + 120;
        const targetCenterX = targetRect.left + targetRect.width / 2;
        const targetCenterY = targetRect.top + targetRect.height / 2;

        return {
            x1: panelCenterX,
            y1: panelCenterY,
            x2: targetCenterX,
            y2: targetCenterY,
        };
    }, [currentStep.placement, panelGeometry.left, panelGeometry.top, panelGeometry.width, targetRect]);

    if (!open) {
        return null;
    }

    return (
        <Portal>
            <Box
                sx={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: theme.zIndex.modal + 20,
                    pointerEvents: 'auto',
                }}
            >
                <Box
                    sx={{
                        position: 'absolute',
                        inset: 0,
                        bgcolor: alpha('#05070d', 0.72),
                        backdropFilter: 'blur(3px)',
                        pointerEvents: 'auto',
                    }}
                />

                {targetRect && currentStep.placement !== 'center' && (
                    <Box
                        sx={{
                            position: 'absolute',
                            left: targetRect.left - 8,
                            top: targetRect.top - 8,
                            width: targetRect.width + 16,
                            height: targetRect.height + 16,
                            borderRadius: 3,
                            border: `2px solid ${theme.palette.primary.main}`,
                            boxShadow: `0 0 0 1px ${alpha('#ffffff', 0.1)}, 0 0 24px ${alpha(theme.palette.primary.main, 0.32)}`,
                            background: alpha(theme.palette.primary.main, 0.08),
                            pointerEvents: 'none',
                        }}
                    />
                )}

                {lineGeometry && (
                    <Box component="svg" viewBox={`0 0 ${window.innerWidth} ${window.innerHeight}`} sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
                        <defs>
                            <marker id="tour-arrowhead" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
                                <path d="M0,0 L8,4 L0,8 Z" fill={theme.palette.primary.main} />
                            </marker>
                        </defs>
                        <line
                            x1={lineGeometry.x1}
                            y1={lineGeometry.y1}
                            x2={lineGeometry.x2}
                            y2={lineGeometry.y2}
                            stroke={theme.palette.primary.main}
                            strokeWidth="3"
                            markerEnd="url(#tour-arrowhead)"
                            opacity="0.95"
                        />
                    </Box>
                )}

                <Paper
                    elevation={18}
                    sx={{
                        position: 'absolute',
                        left: panelGeometry.left,
                        top: panelGeometry.top,
                        width: panelGeometry.width,
                        p: 2.25,
                        borderRadius: 3,
                        backgroundImage: 'none',
                        border: `1px solid ${alpha(theme.palette.primary.main, 0.28)}`,
                        boxShadow: `0 28px 80px ${alpha('#000', 0.55)}`,
                        pointerEvents: 'auto',
                    }}
                >
                    <Typography variant="overline" sx={{ color: 'primary.main', fontWeight: 700, letterSpacing: '0.12em' }}>
                        {strings.onboarding.badge}
                    </Typography>
                    <Typography variant="h6" sx={{ mt: 0.5, mb: 1, fontWeight: 700 }}>
                        {currentStep.title}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.65 }}>
                        {currentStep.body}
                    </Typography>

                    <Box sx={{ mt: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                        <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                            {strings.onboarding.stepOf(stepIndex + 1, tourSteps.length)}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            <Button size="small" color="inherit" onClick={onFinish}>
                                {strings.onboarding.skip}
                            </Button>
                            {stepIndex > 0 && (
                                <Button size="small" color="inherit" onClick={() => setStepIndex((prev) => prev - 1)}>
                                    {strings.onboarding.back}
                                </Button>
                            )}
                            <Button
                                size="small"
                                variant="contained"
                                onClick={() => {
                                    if (stepIndex === tourSteps.length - 1) {
                                        onFinish();
                                        return;
                                    }
                                    setStepIndex((prev) => prev + 1);
                                }}
                            >
                                {stepIndex === tourSteps.length - 1 ? strings.onboarding.finish : strings.onboarding.next}
                            </Button>
                        </Box>
                    </Box>
                </Paper>
            </Box>
        </Portal>
    );
}
