import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
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

const result = await Bun.build({
    entrypoints: [path.join(clientDir, 'index.html')],
    outdir: outDir,
    target: 'browser',
    minify: true,
    splitting: true,
    sourcemap: 'linked',
    env: 'VITE_*',
    define: {
        __APP_VERSION__: JSON.stringify(packageJson.version),
    },
});

if (!result.success) {
    for (const log of result.logs) {
        console.error(log);
    }
    process.exit(1);
}

if (existsSync(publicDir)) {
    cpSync(publicDir, outDir, { recursive: true, force: true });
}
