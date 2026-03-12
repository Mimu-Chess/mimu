export const PIECE_SET_OPTIONS = [
    { id: 'studio', label: 'Studio', source: 'builtin' },
    { id: 'glass', label: 'Glass', source: 'builtin' },
    { id: 'wire', label: 'Wire', source: 'builtin' },
    { id: 'alpha', label: 'Alpha', source: 'en-croissant' },
    { id: 'anarcandy', label: 'Anarcandy', source: 'en-croissant' },
    { id: 'california', label: 'California', source: 'en-croissant' },
    { id: 'cardinal', label: 'Cardinal', source: 'en-croissant' },
    { id: 'cburnett', label: 'CBurnett', source: 'en-croissant' },
    { id: 'chess7', label: 'Chess7', source: 'en-croissant' },
    { id: 'chessnut', label: 'Chessnut', source: 'en-croissant' },
    { id: 'companion', label: 'Companion', source: 'en-croissant' },
    { id: 'disguised', label: 'Disguised', source: 'en-croissant' },
    { id: 'dubrovny', label: 'Dubrovny', source: 'en-croissant' },
    { id: 'fantasy', label: 'Fantasy', source: 'en-croissant' },
    { id: 'fresca', label: 'Fresca', source: 'en-croissant' },
    { id: 'gioco', label: 'Gioco', source: 'en-croissant' },
    { id: 'governor', label: 'Governor', source: 'en-croissant' },
    { id: 'horsey', label: 'Horsey', source: 'en-croissant' },
    { id: 'icpieces', label: 'IC Pieces', source: 'en-croissant' },
    { id: 'kosal', label: 'Kosal', source: 'en-croissant' },
    { id: 'leipzig', label: 'Leipzig', source: 'en-croissant' },
    { id: 'letter', label: 'Letter', source: 'en-croissant' },
    { id: 'libra', label: 'Libra', source: 'en-croissant' },
    { id: 'maestro', label: 'Maestro', source: 'en-croissant' },
    { id: 'merida', label: 'Merida', source: 'en-croissant' },
    { id: 'pirouetti', label: 'Pirouetti', source: 'en-croissant' },
    { id: 'pixel', label: 'Pixel', source: 'en-croissant' },
    { id: 'reillycraig', label: 'Reilly Craig', source: 'en-croissant' },
    { id: 'riohacha', label: 'Riohacha', source: 'en-croissant' },
    { id: 'shapes', label: 'Shapes', source: 'en-croissant' },
    { id: 'spatial', label: 'Spatial', source: 'en-croissant' },
    { id: 'staunty', label: 'Staunty', source: 'en-croissant' },
    { id: 'tatiana', label: 'Tatiana', source: 'en-croissant' },
] as const;

export type AppPieceSetId = (typeof PIECE_SET_OPTIONS)[number]['id'];

export const PIECE_SET_IDS = PIECE_SET_OPTIONS.map((option) => option.id) as AppPieceSetId[];

export const PIECE_SET_LABELS = Object.fromEntries(
    PIECE_SET_OPTIONS.map((option) => [option.id, option.label]),
) as Record<AppPieceSetId, string>;

export function isAppPieceSetId(value: unknown): value is AppPieceSetId {
    return typeof value === 'string' && PIECE_SET_IDS.includes(value as AppPieceSetId);
}
