import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execSync } from 'node:child_process';
const cwd = process.cwd();
const targetDir = path.join(cwd, 'src-tauri', 'bin');
const targetName = os.platform() === 'win32'
    ? 'node-x86_64-pc-windows-msvc.exe'
    : 'node-x86_64-unknown-linux-gnu';
function resolveNodePath() {
    if (process.execPath && fs.existsSync(process.execPath)) {
        return process.execPath;
    }
    const command = os.platform() === 'win32' ? 'where node' : 'which node';
    const output = execSync(command, { encoding: 'utf8' }).trim().split(/\r?\n/).filter(Boolean);
    if (output.length === 0) {
        throw new Error('Unable to locate the Node runtime to bundle with Tauri.');
    }
    return output[0];
}
const sourcePath = resolveNodePath();
fs.mkdirSync(targetDir, { recursive: true });
fs.copyFileSync(sourcePath, path.join(targetDir, targetName));
console.log(`Bundled node runtime from ${sourcePath}`);
