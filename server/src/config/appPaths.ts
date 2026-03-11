import os from 'os';
import path from 'path';

export function getConfigDirectory(): string {
    const appFolderName = 'Mimu Chess';

    switch (process.platform) {
        case 'win32':
            return path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'), appFolderName);
        case 'darwin':
            return path.join(os.homedir(), 'Library', 'Application Support', appFolderName);
        default:
            return path.join(process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config'), 'mimu-chess');
    }
}
