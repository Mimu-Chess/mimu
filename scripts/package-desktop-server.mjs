import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const projectRoot = process.cwd();
const neutralinoConfig = JSON.parse(
    fs.readFileSync(path.join(projectRoot, 'neutralino.config.json'), 'utf8'),
);
const outputDir = path.join(projectRoot, 'dist', neutralinoConfig.cli.binaryName);
const outputName = process.platform === 'win32' ? 'mimu-chess-server.exe' : 'mimu-chess-server';
const outputPath = path.join(outputDir, outputName);
const windowsIconPath = path.join(projectRoot, 'dist', 'MIMU.ico');

function runObjcopyWindowsSubsystem(executablePath) {
    if (process.platform !== 'win32') {
        return;
    }

    execFileSync('objcopy', ['--subsystem', 'windows', executablePath], {
        stdio: 'inherit',
    });
}

if (!fs.existsSync(outputDir)) {
    throw new Error(`Neutralino build output directory not found: ${outputDir}`);
}

execFileSync('bun', [
    'build',
    path.join(projectRoot, 'server', 'src', 'index.ts'),
    '--compile',
    '--windows-hide-console',
    '--windows-icon',
    windowsIconPath,
    '--windows-title',
    'Mimu Chess Server',
    '--windows-description',
    'Mimu Chess bundled backend',
    '--outfile',
    outputPath,
], {
    stdio: 'inherit',
});

runObjcopyWindowsSubsystem(outputPath);

console.log(`Compiled desktop backend to ${outputPath}`);

if (process.platform === 'win32') {
    const packagedClientExecutable = fs.readdirSync(outputDir).find((entry) => /^mimu-chess-win_.*\.exe$/i.test(entry));
    if (!packagedClientExecutable) {
        throw new Error(`Packaged client executable not found in ${outputDir}`);
    }

    const packagedClientPath = path.join(outputDir, packagedClientExecutable);
    const renamedClientPath = path.join(outputDir, 'mimu-chess-client.exe');
    const launcherOutputPath = packagedClientPath;

    if (fs.existsSync(renamedClientPath)) {
        fs.rmSync(renamedClientPath, { force: true });
    }

    fs.renameSync(packagedClientPath, renamedClientPath);

    execFileSync('bun', [
        'build',
        path.join(projectRoot, 'scripts', 'desktop-launcher.ts'),
        '--compile',
        '--windows-hide-console',
        '--windows-icon',
        windowsIconPath,
        '--windows-title',
        'Mimu Chess',
        '--windows-description',
        'Mimu Chess desktop launcher',
        '--outfile',
        launcherOutputPath,
    ], {
        stdio: 'inherit',
    });

    runObjcopyWindowsSubsystem(launcherOutputPath);

    console.log(`Built desktop launcher at ${launcherOutputPath}`);
}
