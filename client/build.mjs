import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const clientDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(clientDir, '..');
const outDir = path.join(projectRoot, 'dist');
const publicDir = path.join(clientDir, 'public');
const packageJsonPath = path.join(projectRoot, 'package.json');
const packageJson = JSON.parse(await Bun.file(packageJsonPath).text());

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

execFileSync('bun', [
    'build',
    './index.html',
    '--production',
    '--outdir=../dist',
    '--sourcemap=linked',
    '--env=VITE_*',
    `--define=__APP_VERSION__=${JSON.stringify(packageJson.version)}`,
], {
    cwd: clientDir,
    stdio: 'inherit',
});

if (existsSync(publicDir)) {
    cpSync(publicDir, outDir, { recursive: true, force: true });
}
