const DEFAULT_SERVER_ORIGIN = 'http://127.0.0.1:3001';

export const SERVER_ORIGIN = (process.env.VITE_SERVER_URL || DEFAULT_SERVER_ORIGIN).replace(/\/$/, '');

export function serverUrl(pathname: string): string {
    if (!pathname.startsWith('/')) {
        return `${SERVER_ORIGIN}/${pathname}`;
    }
    return `${SERVER_ORIGIN}${pathname}`;
}
