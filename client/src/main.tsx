import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';

function showStartupError(error: unknown) {
    const message = error instanceof Error
        ? `${error.name}: ${error.message}\n${error.stack || ''}`
        : String(error);

    const root = document.getElementById('root');
    if (root) {
        root.innerHTML = '';
        const pre = document.createElement('pre');
        pre.textContent = message;
        pre.style.whiteSpace = 'pre-wrap';
        pre.style.wordBreak = 'break-word';
        pre.style.margin = '0';
        pre.style.padding = '20px';
        pre.style.color = '#f8d7da';
        pre.style.background = '#1b0005';
        pre.style.font = '12px/1.5 Consolas, monospace';
        root.appendChild(pre);
    }

    console.error('Startup error:', error);
}

window.addEventListener('error', (event) => {
    showStartupError(event.error ?? event.message);
});

window.addEventListener('unhandledrejection', (event) => {
    showStartupError(event.reason);
});

try {
    createRoot(document.getElementById('root')!).render(
        <StrictMode>
            <App />
        </StrictMode>,
    );
}
catch (error) {
    showStartupError(error);
}
