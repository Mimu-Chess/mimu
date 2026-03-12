import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import { Box, useTheme, useMediaQuery } from '@mui/material';
import { useAppSettings } from '../../context/SettingsContext';
export interface BoardTheme {
    name: string;
    light: string;
    dark: string;
    highlightFrom: string;
    highlightTo: string;
    selected: string;
    legalDot: string;
    legalCapture: string;
}
const DEFAULT_BOARD_THEME: BoardTheme = {
    name: 'Midnight',
    light: '#2d2d44',
    dark: '#1a1a2e',
    highlightFrom: 'rgba(124, 77, 255, 0.25)',
    highlightTo: 'rgba(124, 77, 255, 0.35)',
    selected: 'rgba(124, 77, 255, 0.5)',
    legalDot: 'rgba(124, 77, 255, 0.35)',
    legalCapture: 'rgba(124, 77, 255, 0.4)',
};
const STANDARD_START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const OPTIMISTIC_RESET_MS = 1400;
const SQUARE_PRESS_MS = 170;
interface ChessboardPanelProps {
    fen: string;
    onMove?: (from: string, to: string, promotion?: string) => boolean | void;
    orientation?: 'white' | 'black';
    interactive?: boolean;
    lastMove?: {
        from: string;
        to: string;
    } | null;
    arrows?: Array<{
        from: string;
        to: string;
        color?: string;
    }>;
    boardTheme?: BoardTheme;
}
export default function ChessboardPanel({ fen, onMove, orientation = 'white', interactive = true, lastMove = null, arrows = [], boardTheme = DEFAULT_BOARD_THEME, }: ChessboardPanelProps) {
    const theme = useTheme();
    const { animationsEnabled, showBoardCoordinates } = useAppSettings();
    const isMobile = useMediaQuery(theme.breakpoints.down('lg'));
    const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
    const [legalMoves, setLegalMoves] = useState<string[]>([]);
    const [pieceRipples, setPieceRipples] = useState<Record<string, number[]>>({});
    const [squarePresses, setSquarePresses] = useState<Record<string, number[]>>({});
    const [optimisticFen, setOptimisticFen] = useState<string | null>(null);
    const rippleTimersRef = useRef<Record<number, ReturnType<typeof setTimeout>>>({});
    const pressTimersRef = useRef<Record<number, ReturnType<typeof setTimeout>>>({});
    const optimisticResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const rippleIdRef = useRef(0);
    const pressIdRef = useRef(0);
    const lastRippleAtRef = useRef<Record<string, number>>({});
    const lastPressAtRef = useRef<Record<string, number>>({});
    const normalizedFen = useMemo(() => {
        if (!fen || fen === 'start' || fen === 'startpos') {
            return STANDARD_START_FEN;
        }
        try {
            const parsed = new Chess(fen);
            return parsed.fen();
        }
        catch {
            return STANDARD_START_FEN;
        }
    }, [fen]);
    const clearOptimisticTimer = useCallback(() => {
        if (optimisticResetTimerRef.current) {
            clearTimeout(optimisticResetTimerRef.current);
            optimisticResetTimerRef.current = null;
        }
    }, []);
    const clearOptimisticFen = useCallback(() => {
        clearOptimisticTimer();
        setOptimisticFen(null);
    }, [clearOptimisticTimer]);
    const displayFen = optimisticFen ?? normalizedFen;
    const canInteract = interactive && optimisticFen === null;
    const chess = useMemo(() => {
        try {
            return new Chess(displayFen);
        }
        catch {
            return new Chess();
        }
    }, [displayFen]);
    useEffect(() => {
        return () => {
            for (const timer of Object.values(rippleTimersRef.current)) {
                clearTimeout(timer);
            }
            rippleTimersRef.current = {};
            for (const timer of Object.values(pressTimersRef.current)) {
                clearTimeout(timer);
            }
            pressTimersRef.current = {};
            clearOptimisticTimer();
        };
    }, [clearOptimisticTimer]);
    useEffect(() => {
        clearOptimisticFen();
    }, [normalizedFen, clearOptimisticFen]);
    const triggerPieceRipple = useCallback((square: string) => {
        if (!square)
            return;
        const now = Date.now();
        const lastAt = lastRippleAtRef.current[square] ?? 0;
        if (now - lastAt < 70)
            return;
        lastRippleAtRef.current[square] = now;
        const rippleId = ++rippleIdRef.current;
        setPieceRipples((prev) => ({
            ...prev,
            [square]: [...(prev[square] || []), rippleId],
        }));
        rippleTimersRef.current[rippleId] = setTimeout(() => {
            setPieceRipples((prev) => {
                const next = { ...prev };
                const remaining = (next[square] || []).filter((id) => id !== rippleId);
                if (remaining.length > 0) {
                    next[square] = remaining;
                }
                else {
                    delete next[square];
                }
                return next;
            });
            delete rippleTimersRef.current[rippleId];
        }, 200);
    }, []);
    const triggerSquarePress = useCallback((square: string) => {
        if (!square)
            return;
        const now = Date.now();
        const lastAt = lastPressAtRef.current[square] ?? 0;
        if (now - lastAt < 70)
            return;
        lastPressAtRef.current[square] = now;
        const pressId = ++pressIdRef.current;
        setSquarePresses((prev) => ({
            ...prev,
            [square]: [...(prev[square] || []), pressId],
        }));
        pressTimersRef.current[pressId] = setTimeout(() => {
            setSquarePresses((prev) => {
                const next = { ...prev };
                const remaining = (next[square] || []).filter((id) => id !== pressId);
                if (remaining.length > 0) {
                    next[square] = remaining;
                }
                else {
                    delete next[square];
                }
                return next;
            });
            delete pressTimersRef.current[pressId];
        }, SQUARE_PRESS_MS);
    }, []);
    const applyOptimisticMove = useCallback((from: string, to: string, promotion?: string): boolean => {
        try {
            const preview = new Chess(displayFen);
            const move = preview.move({
                from: from as any,
                to: to as any,
                promotion: promotion as any,
            });
            if (!move) {
                return false;
            }
            setOptimisticFen(preview.fen());
            clearOptimisticTimer();
            optimisticResetTimerRef.current = setTimeout(() => {
                optimisticResetTimerRef.current = null;
                setOptimisticFen(null);
            }, OPTIMISTIC_RESET_MS);
            return true;
        }
        catch {
            return false;
        }
    }, [displayFen, clearOptimisticTimer]);
    const selectSquareAndMoves = useCallback((square: string) => {
        const moves = chess.moves({ square: square as any, verbose: true });
        if (moves.length > 0) {
            setSelectedSquare(square);
            setLegalMoves(moves.map((m) => m.to));
            return true;
        }
        setSelectedSquare(null);
        setLegalMoves([]);
        return false;
    }, [chess]);
    const onSquareClick = useCallback(({ square }: {
        piece: any;
        square: string;
    }) => {
        if (!canInteract)
            return;
        if (chess.get(square as any)) {
            triggerPieceRipple(square);
            triggerSquarePress(square);
        }
        if (selectedSquare) {
            const moves = chess.moves({ square: selectedSquare as any, verbose: true });
            const targetMove = moves.find((m) => m.to === square);
            if (targetMove) {
                const promotion = targetMove.flags.includes('p') ? 'q' : undefined;
                if (onMove) {
                    const didApply = applyOptimisticMove(selectedSquare, square, promotion);
                    if (!didApply) {
                        setSelectedSquare(null);
                        setLegalMoves([]);
                        return;
                    }
                    const accepted = onMove(selectedSquare, square, promotion);
                    if (accepted === false) {
                        clearOptimisticFen();
                    }
                }
                setSelectedSquare(null);
                setLegalMoves([]);
                return;
            }
            selectSquareAndMoves(square);
        }
        else {
            selectSquareAndMoves(square);
        }
    }, [applyOptimisticMove, canInteract, chess, clearOptimisticFen, onMove, selectSquareAndMoves, selectedSquare, triggerPieceRipple, triggerSquarePress]);
    const onPieceClick = useCallback(({ square }: {
        piece: any;
        square?: string | null;
    }) => {
        if (!canInteract || !square)
            return;
        triggerPieceRipple(square);
        triggerSquarePress(square);
        selectSquareAndMoves(square);
    }, [canInteract, selectSquareAndMoves, triggerPieceRipple, triggerSquarePress]);
    const onPieceDrop = useCallback(({ sourceSquare, targetSquare, piece }: {
        piece: any;
        sourceSquare: string;
        targetSquare: string | null;
    }): boolean => {
        if (!canInteract || !onMove || !targetSquare)
            return false;
        const pieceType = piece?.pieceType || '';
        const isPawn = typeof pieceType === 'string' && (pieceType.endsWith('P') || pieceType.endsWith('p'));
        const promotion = isPawn && (targetSquare[1] === '8' || targetSquare[1] === '1') ? 'q' : undefined;
        const didApply = applyOptimisticMove(sourceSquare, targetSquare, promotion);
        if (!didApply) {
            return false;
        }
        const result = onMove(sourceSquare, targetSquare, promotion);
        if (result === false) {
            clearOptimisticFen();
            return false;
        }
        setSelectedSquare(null);
        setLegalMoves([]);
        return true;
    }, [applyOptimisticMove, canInteract, clearOptimisticFen, onMove]);
    const squareStyles = useMemo((): Record<string, React.CSSProperties> => {
        const styles: Record<string, React.CSSProperties> = {};
        if (lastMove) {
            styles[lastMove.from] = { backgroundColor: boardTheme.highlightFrom };
            styles[lastMove.to] = { backgroundColor: boardTheme.highlightTo };
        }
        if (selectedSquare) {
            styles[selectedSquare] = { backgroundColor: boardTheme.selected };
        }
        return styles;
    }, [
        boardTheme.highlightFrom,
        boardTheme.highlightTo,
        boardTheme.selected,
        lastMove,
        selectedSquare,
    ]);
    const boardArrows = useMemo(() => arrows.map((arrow) => ({
        startSquare: arrow.from,
        endSquare: arrow.to,
        color: arrow.color || 'rgba(56, 189, 248, 0.88)',
    })), [arrows]);
    const legalMoveSet = useMemo(() => new Set(legalMoves), [legalMoves]);
    const squareRenderer = useCallback(({ piece, square, children }: {
        piece: any;
        square: string;
        children?: any;
    }) => {
        const rippleIds = pieceRipples[square] || [];
        const pressIds = squarePresses[square] || [];
        const isLegalTarget = legalMoveSet.has(square);
        return (<Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
                    {(rippleIds.length > 0 || pressIds.length > 0) && (<Box sx={{
                    position: 'absolute',
                    inset: 0,
                    overflow: 'hidden',
                    pointerEvents: 'none',
                    zIndex: 0,
                }}>
                            {pressIds.map((pressId) => (<Box key={pressId} sx={{
                        position: 'absolute',
                        inset: 0,
                        backgroundColor: boardTheme.selected,
                        opacity: 0,
                        animation: 'mui-square-press 170ms cubic-bezier(0.4, 0, 0.2, 1)',
                        transformOrigin: 'center',
                        willChange: 'transform, opacity',
                        zIndex: 2,
                    }}/>))}
                            {rippleIds.map((rippleId) => (<Box key={rippleId} sx={{
                        position: 'absolute',
                        left: '50%',
                        top: '50%',
                        width: isMobile ? '150%' : '140%',
                        aspectRatio: '1 / 1',
                        borderRadius: '50%',
                        transform: 'translate(-50%, -50%) scale(0)',
                        backgroundColor: boardTheme.selected,
                        opacity: 0.34,
                        filter: `drop-shadow(0 0 8px ${boardTheme.selected})`,
                        animation: 'mui-square-ripple-enter 200ms cubic-bezier(0.2, 0, 0, 1)',
                        willChange: 'transform, opacity',
                    }}/>))}
                        </Box>)}
                    {isLegalTarget && (<Box sx={{
                    position: 'absolute',
                    left: '50%',
                    top: '50%',
                    width: piece ? '20%' : '28%',
                    aspectRatio: '1 / 1',
                    borderRadius: '50%',
                    transform: 'translate(-50%, -50%)',
                    backgroundColor: boardTheme.legalDot,
                    border: `2px solid ${boardTheme.legalCapture}`,
                    boxShadow: `0 0 0 1px ${boardTheme.dark} inset`,
                    zIndex: 3,
                    pointerEvents: 'none',
                }}/>)}
                    <Box sx={{ position: 'relative', zIndex: 1, width: '100%', height: '100%' }}>{children}</Box>
                </Box>);
    }, [pieceRipples, squarePresses, legalMoveSet, isMobile, boardTheme.selected, boardTheme.legalDot, boardTheme.legalCapture, boardTheme.dark]);
    const boardSize = isMobile
        ? 'clamp(280px, calc(100vw - 32px), 420px)'
        : 'clamp(360px, calc(100vw - 380px), 520px)';
    return (<Box sx={{
            width: boardSize,
            aspectRatio: '1 / 1',
            borderRadius: 1.5,
            overflow: 'hidden',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
            flexShrink: 0,
            willChange: 'transform',
        }}>
            <Chessboard options={{
            id: 'main-board',
            position: displayFen,
            boardOrientation: orientation,
            onPieceDrop: onPieceDrop,
            onPieceClick: onPieceClick,
            onSquareClick: onSquareClick,
            squareRenderer: squareRenderer,
            squareStyles: squareStyles,
            darkSquareStyle: { backgroundColor: boardTheme.dark },
            lightSquareStyle: { backgroundColor: boardTheme.light },
            boardStyle: { borderRadius: '6px' },
            dropSquareStyle: { boxShadow: `inset 0 0 1px 5px ${boardTheme.selected}` },
            showAnimations: animationsEnabled,
            animationDurationInMs: animationsEnabled ? 48 : 0,
            draggingPieceStyle: { cursor: 'grabbing', filter: 'drop-shadow(0 4px 10px rgba(0, 0, 0, 0.45))' },
            draggingPieceGhostStyle: { opacity: '0.45' },
            allowDragging: canInteract,
            dragActivationDistance: 3,
            arrows: boardArrows,
            allowDrawingArrows: false,
            showNotation: showBoardCoordinates,
        }}/>
        </Box>);
}
