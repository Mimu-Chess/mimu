import type { CSSProperties, ReactElement } from 'react';
import type { PieceRenderObject } from 'react-chessboard';
import type { AppPieceSetId } from '../../lib/desktopConfig';
import { EN_CROISSANT_PIECE_IMAGES } from '../../lib/enCroissantPieceData';
import { PIECE_SET_IDS } from '../../lib/pieceSetCatalog';

type PieceKey = 'wK' | 'wQ' | 'wR' | 'wB' | 'wN' | 'wP' | 'bK' | 'bQ' | 'bR' | 'bB' | 'bN' | 'bP';
type PieceRenderProps = {
    fill?: string;
    square?: string;
    svgStyle?: CSSProperties;
};
type PieceRenderer = (props?: PieceRenderProps) => ReactElement;

type PieceStyle = {
    fill: string;
    stroke: string;
    strokeWidth: number;
    halo: string;
    textShadow: string;
    gradientStart?: string;
    gradientEnd?: string;
    fontFamily: string;
};

type BuiltInPieceSetId = 'studio' | 'glass' | 'wire';
type InternalPieceRenderObject = Record<PieceKey, PieceRenderer>;

const PIECE_SYMBOLS: Record<PieceKey, string> = {
    wK: '\u2654',
    wQ: '\u2655',
    wR: '\u2656',
    wB: '\u2657',
    wN: '\u2658',
    wP: '\u2659',
    bK: '\u265A',
    bQ: '\u265B',
    bR: '\u265C',
    bB: '\u265D',
    bN: '\u265E',
    bP: '\u265F',
};

const BUILTIN_PIECE_SET_IDS: BuiltInPieceSetId[] = ['studio', 'glass', 'wire'];

const SET_STYLES: Record<BuiltInPieceSetId, Record<'white' | 'black', PieceStyle>> = {
    studio: {
        white: {
            fill: '#f7f1e4',
            stroke: 'rgba(29, 32, 43, 0.58)',
            strokeWidth: 2.4,
            halo: 'rgba(255, 244, 214, 0.38)',
            textShadow: 'drop-shadow(0 2px 3px rgba(11, 12, 18, 0.24))',
            fontFamily: '\'Noto Sans Symbols 2\', \'Segoe UI Symbol\', serif',
        },
        black: {
            fill: '#1b1d26',
            stroke: 'rgba(246, 243, 234, 0.2)',
            strokeWidth: 2.2,
            halo: 'rgba(20, 22, 30, 0.34)',
            textShadow: 'drop-shadow(0 3px 4px rgba(0, 0, 0, 0.32))',
            fontFamily: '\'Noto Sans Symbols 2\', \'Segoe UI Symbol\', serif',
        },
    },
    glass: {
        white: {
            fill: '#fdfcff',
            stroke: 'rgba(117, 152, 255, 0.42)',
            strokeWidth: 2.8,
            halo: 'rgba(122, 163, 255, 0.28)',
            textShadow: 'drop-shadow(0 2px 6px rgba(122, 163, 255, 0.34))',
            gradientStart: '#ffffff',
            gradientEnd: '#d5ddff',
            fontFamily: '\'Noto Sans Symbols 2\', \'Segoe UI Symbol\', serif',
        },
        black: {
            fill: '#121623',
            stroke: 'rgba(106, 201, 255, 0.28)',
            strokeWidth: 2.5,
            halo: 'rgba(39, 65, 110, 0.28)',
            textShadow: 'drop-shadow(0 2px 6px rgba(39, 65, 110, 0.44))',
            gradientStart: '#2a3146',
            gradientEnd: '#0d111c',
            fontFamily: '\'Noto Sans Symbols 2\', \'Segoe UI Symbol\', serif',
        },
    },
    wire: {
        white: {
            fill: 'rgba(255, 255, 255, 0.22)',
            stroke: '#faf6ed',
            strokeWidth: 4.3,
            halo: 'rgba(255, 255, 255, 0.1)',
            textShadow: 'drop-shadow(0 1px 1px rgba(0, 0, 0, 0.12))',
            fontFamily: '\'Noto Sans Symbols 2\', \'Segoe UI Symbol\', serif',
        },
        black: {
            fill: 'rgba(17, 20, 28, 0.16)',
            stroke: '#171b28',
            strokeWidth: 4.1,
            halo: 'rgba(17, 20, 28, 0.08)',
            textShadow: 'drop-shadow(0 1px 1px rgba(255, 255, 255, 0.06))',
            fontFamily: '\'Noto Sans Symbols 2\', \'Segoe UI Symbol\', serif',
        },
    },
};

function isBuiltInPieceSetId(setId: AppPieceSetId): setId is BuiltInPieceSetId {
    return BUILTIN_PIECE_SET_IDS.includes(setId as BuiltInPieceSetId);
}

function renderPiece(pieceKey: PieceKey, setId: AppPieceSetId, props?: PieceRenderProps) {
    if (!isBuiltInPieceSetId(setId)) {
        const imageUri = EN_CROISSANT_PIECE_IMAGES[setId]?.[pieceKey];
        if (imageUri) {
            return (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%" style={props?.svgStyle}>
                    <image href={imageUri} x="0" y="0" width="100" height="100" preserveAspectRatio="xMidYMid meet" />
                </svg>
            );
        }
    }

    const builtInSetId: BuiltInPieceSetId = isBuiltInPieceSetId(setId) ? setId : 'studio';
    const side = pieceKey.startsWith('w') ? 'white' : 'black';
    const style = SET_STYLES[builtInSetId][side];
    const gradientId = `${builtInSetId}-${pieceKey}-gradient`;
    const fill = style.gradientStart && style.gradientEnd ? `url(#${gradientId})` : style.fill;

    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 100 100"
            width="100%"
            height="100%"
            style={{
                overflow: 'visible',
                filter: style.textShadow,
                ...props?.svgStyle,
            }}
        >
            <defs>
                {style.gradientStart && style.gradientEnd && (
                    <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor={style.gradientStart} />
                        <stop offset="100%" stopColor={style.gradientEnd} />
                    </linearGradient>
                )}
            </defs>
            <ellipse cx="50" cy="56" rx="26" ry="26" fill={style.halo} />
            <text
                x="50"
                y="59"
                textAnchor="middle"
                dominantBaseline="middle"
                fill={fill}
                stroke={style.stroke}
                strokeWidth={style.strokeWidth}
                paintOrder="stroke fill"
                fontSize="76"
                fontWeight="700"
                fontFamily={style.fontFamily}
            >
                {PIECE_SYMBOLS[pieceKey]}
            </text>
        </svg>
    );
}

function buildPieceSet(setId: AppPieceSetId): InternalPieceRenderObject {
    return {
        wK: (props) => renderPiece('wK', setId, props),
        wQ: (props) => renderPiece('wQ', setId, props),
        wR: (props) => renderPiece('wR', setId, props),
        wB: (props) => renderPiece('wB', setId, props),
        wN: (props) => renderPiece('wN', setId, props),
        wP: (props) => renderPiece('wP', setId, props),
        bK: (props) => renderPiece('bK', setId, props),
        bQ: (props) => renderPiece('bQ', setId, props),
        bR: (props) => renderPiece('bR', setId, props),
        bB: (props) => renderPiece('bB', setId, props),
        bN: (props) => renderPiece('bN', setId, props),
        bP: (props) => renderPiece('bP', setId, props),
    };
}

export const PIECE_SET_RENDERERS: Record<AppPieceSetId, PieceRenderObject> = PIECE_SET_IDS.reduce(
    (renderers, setId) => {
        renderers[setId] = buildPieceSet(setId);
        return renderers;
    },
    {} as Record<AppPieceSetId, PieceRenderObject>,
);
