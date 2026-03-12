import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const projectRoot = process.cwd();
const neutralinoConfig = JSON.parse(
    fs.readFileSync(path.join(projectRoot, 'neutralino.config.json'), 'utf8'),
);
const outputDir = path.join(projectRoot, 'dist', neutralinoConfig.cli.binaryName);
const executableExtension = process.platform === 'win32' ? '.exe' : '';
const outputName = `mimu-chess-server${executableExtension}`;
const outputPath = path.join(outputDir, outputName);
const windowsIconPath = path.join(projectRoot, 'dist', 'MIMU.ico');

function buildCompileArgs(entrypoint, outfile, windowsMetadata) {
    const args = [
        'build',
        entrypoint,
        '--compile',
        '--outfile',
        outfile,
    ];

    if (process.platform === 'win32') {
        args.push(
            '--windows-hide-console',
            '--windows-icon',
            windowsIconPath,
            '--windows-title',
            windowsMetadata.title,
            '--windows-description',
            windowsMetadata.description,
        );
    }

    return args;
}

function getHostClientBinaryCandidates() {
    const binaryName = neutralinoConfig.cli.binaryName;

    switch (process.platform) {
        case 'win32':
            return [`${binaryName}-win_x64.exe`];
        case 'darwin':
            if (process.arch === 'arm64') {
                return [`${binaryName}-mac_arm64`, `${binaryName}-mac_universal`, `${binaryName}-mac_x64`];
            }
            return [`${binaryName}-mac_x64`, `${binaryName}-mac_universal`, `${binaryName}-mac_arm64`];
        case 'linux':
            if (process.arch === 'arm64') {
                return [`${binaryName}-linux_arm64`, `${binaryName}-linux_x64`, `${binaryName}-linux_armhf`];
            }
            if (process.arch === 'arm') {
                return [`${binaryName}-linux_armhf`, `${binaryName}-linux_arm64`, `${binaryName}-linux_x64`];
            }
            return [`${binaryName}-linux_x64`, `${binaryName}-linux_arm64`, `${binaryName}-linux_armhf`];
        default:
            return [];
    }
}

function resolveHostClientBinary() {
    for (const candidate of getHostClientBinaryCandidates()) {
        if (fs.existsSync(path.join(outputDir, candidate))) {
            return candidate;
        }
    }

    throw new Error(`Packaged client executable not found for ${process.platform}/${process.arch} in ${outputDir}`);
}

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

execFileSync('bun', buildCompileArgs(
    path.join(projectRoot, 'server', 'src', 'index.ts'),
    outputPath,
    {
        title: 'Mimu Chess Server',
        description: 'Mimu Chess bundled backend',
    },
), {
    stdio: 'inherit',
});

runObjcopyWindowsSubsystem(outputPath);

console.log(`Compiled desktop backend to ${outputPath}`);

const packagedClientExecutable = resolveHostClientBinary();
const packagedClientPath = path.join(outputDir, packagedClientExecutable);
const renamedClientPath = path.join(outputDir, `mimu-chess-client${executableExtension}`);
const launcherOutputPath = packagedClientPath;

if (fs.existsSync(renamedClientPath)) {
    fs.rmSync(renamedClientPath, { force: true });
}

fs.renameSync(packagedClientPath, renamedClientPath);

execFileSync('bun', buildCompileArgs(
    path.join(projectRoot, 'scripts', 'desktop-launcher.ts'),
    launcherOutputPath,
    {
        title: 'Mimu Chess',
        description: 'Mimu Chess desktop launcher',
    },
), {
    stdio: 'inherit',
});

runObjcopyWindowsSubsystem(launcherOutputPath);

console.log(`Built desktop launcher at ${launcherOutputPath}`);
