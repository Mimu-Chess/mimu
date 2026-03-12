declare module '*.css';

declare const __APP_VERSION__: string;

declare global {
    interface Window {
        NL_OS: 'Windows' | 'Linux' | 'Darwin' | 'FreeBSD' | 'Unknown';
        NL_PATH: string;
        NL_RESMODE: 'bundle' | 'directory';
        Neutralino?: unknown;
    }
}
