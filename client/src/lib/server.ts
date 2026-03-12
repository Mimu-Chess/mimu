const DEFAULT_SERVER_ORIGIN = 'http://127.0.0.1:3001';

function getServerOrigin(): string {
    const globalProcess = typeof globalThis === 'object'
        ? (globalThis as typeof globalThis & {
            process?: {
                env?: Record<string, string | undefined>;
            };
        }).process
        : undefined;

    const configuredOrigin = globalProcess?.env?.VITE_SERVER_URL;
    if (typeof configuredOrigin === 'string' && configuredOrigin.trim()) {
        return configuredOrigin;
    }

    return DEFAULT_SERVER_ORIGIN;
}

export const SERVER_ORIGIN = getServerOrigin().replace(/\/$/, '');

export function serverUrl(pathname: string): string {
    if (!pathname.startsWith('/')) {
        return `${SERVER_ORIGIN}/${pathname}`;
    }
    return `${SERVER_ORIGIN}${pathname}`;
}
