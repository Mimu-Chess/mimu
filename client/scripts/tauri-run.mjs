import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
const subcommand = process.argv[2];
if (!subcommand || !['dev', 'build'].includes(subcommand)) {
    console.error('Usage: node ./scripts/tauri-run.mjs <dev|build>');
    process.exit(1);
}
const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
const cargoTargetDir = path.join(localAppData, 'MimuChess', 'tauri-target');
fs.mkdirSync(cargoTargetDir, { recursive: true });
const child = process.platform === 'win32'
    ? spawn('cmd.exe', ['/c', path.resolve('node_modules', '.bin', 'tauri.cmd'), subcommand], {
        stdio: 'inherit',
        shell: false,
        env: {
            ...process.env,
            CARGO_TARGET_DIR: cargoTargetDir,
            CARGO_BUILD_JOBS: process.env.CARGO_BUILD_JOBS || '1',
        },
    })
    : spawn(path.resolve('node_modules', '.bin', 'tauri'), [subcommand], {
        stdio: 'inherit',
        shell: false,
        env: {
            ...process.env,
            CARGO_TARGET_DIR: cargoTargetDir,
            CARGO_BUILD_JOBS: process.env.CARGO_BUILD_JOBS || '1',
        },
    });
child.on('exit', (code, signal) => {
    if (signal) {
        process.kill(process.pid, signal);
        return;
    }
    process.exit(code ?? 1);
});
child.on('error', (err) => {
    console.error(`Failed to start Tauri CLI: ${err.message}`);
    process.exit(1);
});
