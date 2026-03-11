import fs from 'node:fs';
import path from 'node:path';

const projectRoot = process.cwd();
const clientLibrarySource = path.join(projectRoot, 'node_modules', '@neutralinojs', 'lib', 'dist', 'neutralino.js');
const clientLibraryTargetDir = path.join(projectRoot, 'dist', 'js');
const clientLibraryTarget = path.join(clientLibraryTargetDir, 'neutralino.js');
const iconPngSource = path.join(projectRoot, 'dist', 'MIMU.png');
const iconIcoTarget = path.join(projectRoot, 'dist', 'MIMU.ico');

function createIcoFromPng(pngBuffer) {
    const pngSignature = '89504e470d0a1a0a';
    if (pngBuffer.subarray(0, 8).toString('hex') !== pngSignature) {
        throw new Error('MIMU.png is not a valid PNG file.');
    }

    const width = pngBuffer.readUInt32BE(16);
    const height = pngBuffer.readUInt32BE(20);
    const iconDir = Buffer.alloc(6);
    iconDir.writeUInt16LE(0, 0);
    iconDir.writeUInt16LE(1, 2);
    iconDir.writeUInt16LE(1, 4);

    const entry = Buffer.alloc(16);
    entry.writeUInt8(width >= 256 ? 0 : width, 0);
    entry.writeUInt8(height >= 256 ? 0 : height, 1);
    entry.writeUInt8(0, 2);
    entry.writeUInt8(0, 3);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(pngBuffer.length, 8);
    entry.writeUInt32LE(iconDir.length + entry.length, 12);

    return Buffer.concat([iconDir, entry, pngBuffer]);
}

fs.mkdirSync(clientLibraryTargetDir, { recursive: true });
fs.copyFileSync(clientLibrarySource, clientLibraryTarget);
fs.writeFileSync(iconIcoTarget, createIcoFromPng(fs.readFileSync(iconPngSource)));

console.log(`Copied Neutralino client library to ${clientLibraryTarget}`);
console.log(`Generated Windows icon at ${iconIcoTarget}`);
