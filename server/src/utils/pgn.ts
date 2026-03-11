export interface PGNOptions {
    white: string;
    black: string;
    result: string;
    moves: string[];
    date?: Date;
    event?: string;
    site?: string;
    round?: string;
    headers?: Record<string, string>;
}

function escapePgnHeaderValue(value: string): string {
    return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

export function generatePGN(options: PGNOptions): string {
    const date = options.date || new Date();
    const dateStr = `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
    let pgn = '';
    pgn += `[Event "${options.event || 'Mimu Chess Game'}"]\n`;
    pgn += `[Site "${options.site || 'Mimu Chess'}"]\n`;
    pgn += `[Date "${dateStr}"]\n`;
    pgn += `[Round "${options.round || '-'}"]\n`;
    pgn += `[White "${options.white}"]\n`;
    pgn += `[Black "${options.black}"]\n`;
    pgn += `[Result "${options.result}"]\n`;
    for (const [key, value] of Object.entries(options.headers || {})) {
        pgn += `[${key} "${escapePgnHeaderValue(value)}"]\n`;
    }
    pgn += '\n';
    const moves = options.moves;
    let moveText = '';
    for (let i = 0; i < moves.length; i++) {
        if (i % 2 === 0) {
            moveText += `${Math.floor(i / 2) + 1}. `;
        }
        moveText += moves[i] + ' ';
    }
    moveText += options.result;
    const lines: string[] = [];
    let currentLine = '';
    const words = moveText.split(' ');
    for (const word of words) {
        if (currentLine.length + word.length + 1 > 80 && currentLine.length > 0) {
            lines.push(currentLine);
            currentLine = word;
        }
        else {
            currentLine += (currentLine.length > 0 ? ' ' : '') + word;
        }
    }
    if (currentLine)
        lines.push(currentLine);
    pgn += lines.join('\n') + '\n';
    return pgn;
}
