import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { spawn } from 'node:child_process';

const isWindows = process.platform === 'win32';
const executableExtension = isWindows ? '.exe' : '';
const appDirectory = path.dirname(process.execPath);
const clientExecutable = path.join(appDirectory, `mimu-chess-client${executableExtension}`);
const serverExecutable = path.join(appDirectory, `mimu-chess-server${executableExtension}`);

function requireExecutable(filePath: string) {
    if (!fs.existsSync(filePath)) {
        throw new Error(`Required executable not found: ${filePath}`);
    }
}

function escapePowerShellSingleQuoted(value: string) {
    return value.replaceAll("'", "''");
}

async function startServerProcess(): Promise<number | undefined> {
    if (!isWindows) {
        const serverProcess = spawn(serverExecutable, [], {
            cwd: appDirectory,
            stdio: 'ignore',
            windowsHide: false,
            detached: false,
            shell: false,
            env: {
                ...process.env,
                PORT: process.env.PORT ?? '3001',
            },
        });
        return serverProcess.pid;
    }

    const escapedExecutable = escapePowerShellSingleQuoted(serverExecutable);
    const escapedWorkingDirectory = escapePowerShellSingleQuoted(appDirectory);
    const escapedPort = escapePowerShellSingleQuoted(process.env.PORT ?? '3001');
    const powerShellScript = [
        `$env:PORT='${escapedPort}'`,
        `$process = Start-Process -FilePath '${escapedExecutable}' -WorkingDirectory '${escapedWorkingDirectory}' -WindowStyle Hidden -PassThru`,
        'Write-Output $process.Id',
    ].join('; ');

    return await new Promise<number | undefined>((resolve, reject) => {
        const launcher = spawn('powershell.exe', [
            '-NoProfile',
            '-NonInteractive',
            '-ExecutionPolicy',
            'Bypass',
            '-Command',
            powerShellScript,
        ], {
            cwd: appDirectory,
            stdio: ['ignore', 'pipe', 'pipe'],
            windowsHide: true,
            shell: false,
        });

        let stdout = '';
        let stderr = '';

        launcher.stdout.on('data', (chunk) => {
            stdout += chunk.toString();
        });

        launcher.stderr.on('data', (chunk) => {
            stderr += chunk.toString();
        });

        launcher.on('error', reject);
        launcher.on('close', (code) => {
            if (code !== 0) {
                reject(new Error(stderr.trim() || `Failed to launch hidden server process (exit ${code ?? 'unknown'}).`));
                return;
            }

            const pid = Number.parseInt(stdout.trim(), 10);
            resolve(Number.isFinite(pid) ? pid : undefined);
        });
    });
}

function killServerProcess(pid: number | undefined): Promise<void> {
    if (!pid) {
        return Promise.resolve();
    }

    if (!isWindows) {
        return new Promise((resolve) => {
            try {
                process.kill(pid, 'SIGTERM');
            }
            catch {
                // The process may already be gone.
            }
            resolve();
        });
    }

    return new Promise((resolve) => {
        const killer = spawn('taskkill', ['/PID', String(pid), '/T', '/F'], {
            stdio: 'ignore',
            windowsHide: true,
        });
        killer.on('close', () => resolve());
        killer.on('error', () => resolve());
    });
}

function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function canConnect(port: number, host: string): Promise<boolean> {
    return new Promise((resolve) => {
        const socket = net.createConnection({ port, host });
        const finish = (result: boolean) => {
            socket.removeAllListeners();
            socket.destroy();
            resolve(result);
        };

        socket.setTimeout(800);
        socket.on('connect', () => finish(true));
        socket.on('timeout', () => finish(false));
        socket.on('error', () => finish(false));
    });
}

async function waitForServer(port: number, host: string, timeoutMs: number): Promise<boolean> {
    const startedAt = Date.now();

    while (Date.now() - startedAt < timeoutMs) {
        if (await canConnect(port, host)) {
            return true;
        }
        await delay(250);
    }

    return false;
}

async function main() {
    requireExecutable(clientExecutable);
    requireExecutable(serverExecutable);

    const serverPid = await startServerProcess();

    const serverReady = await waitForServer(3001, '127.0.0.1', 12000);
    if (!serverReady) {
        await killServerProcess(serverPid);
        throw new Error('Bundled backend did not become ready on 127.0.0.1:3001.');
    }

    const clientProcess = spawn(clientExecutable, process.argv.slice(2), {
        cwd: appDirectory,
        stdio: 'ignore',
        windowsHide: false,
        shell: false,
    });

    const shutdown = async (exitCode: number = 0) => {
        await killServerProcess(serverPid);
        process.exit(exitCode);
    };

    process.on('SIGINT', () => {
        void shutdown(0);
    });
    process.on('SIGTERM', () => {
        void shutdown(0);
    });

    clientProcess.on('error', async () => {
        await shutdown(1);
    });

    clientProcess.on('exit', async (code) => {
        await shutdown(code ?? 0);
    });
}

void main().catch((error) => {
    console.error(error);
    process.exit(1);
});
