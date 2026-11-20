"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FFPROBE_PATH = exports.FFMPEG_PATH = exports.YTDLP_PATH = exports.FILE_TTL_MS = exports.TEMP_DIR = exports.PORT = void 0;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const child_process_1 = require("child_process");
// Resolve environment and paths
exports.PORT = parseInt(process.env.PORT || '5000', 10);
exports.TEMP_DIR = path_1.default.resolve(__dirname, '..', 'temp');
exports.FILE_TTL_MS = 15 * 60 * 1000; // 15 minutes TTL
// Ensure temp directory exists
if (!fs_1.default.existsSync(exports.TEMP_DIR)) {
    fs_1.default.mkdirSync(exports.TEMP_DIR, { recursive: true });
}
function findExecutable(name, candidatePaths) {
    // Check env override first
    const envName = name.toUpperCase().replace(/[^A-Z0-9]/g, '_') + '_PATH';
    if (process.env[envName] && fs_1.default.existsSync(process.env[envName])) {
        return process.env[envName];
    }
    // Check PATH first via where/which
    try {
        const cmd = process.platform === 'win32' ? `where.exe ${name}` : `which ${name}`;
        const output = (0, child_process_1.execSync)(cmd, { stdio: ['pipe', 'pipe', 'ignore'], encoding: 'utf-8' }).trim();
        const firstLine = output.split(/\r?\n/)[0]?.trim();
        if (firstLine && fs_1.default.existsSync(firstLine)) {
            return firstLine;
        }
    }
    catch {
        // Ignore and proceed to candidates
    }
    // Check candidate paths
    for (const candidate of candidatePaths) {
        if (fs_1.default.existsSync(candidate)) {
            return candidate;
        }
    }
    // Default to naked command name for system PATH lookup
    return name;
}
let ffmpegStaticPath = null;
try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const staticFfmpeg = require('ffmpeg-static');
    if (staticFfmpeg && fs_1.default.existsSync(staticFfmpeg)) {
        ffmpegStaticPath = staticFfmpeg;
    }
}
catch {
    // ignore
}
const localBinYtdlp = path_1.default.join(__dirname, '..', 'bin', process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp');
const rootBinYtdlp = path_1.default.join(__dirname, '..', '..', 'bin', process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp');
const YTDLP_CANDIDATES = [
    localBinYtdlp,
    rootBinYtdlp,
    'C:\\Users\\jogil\\AppData\\Local\\Programs\\Python\\Python312\\Scripts\\yt-dlp.exe',
    'C:\\Python312\\Scripts\\yt-dlp.exe',
    'C:\\Python311\\Scripts\\yt-dlp.exe',
    'C:\\Python310\\Scripts\\yt-dlp.exe',
    path_1.default.join(process.env.LOCALAPPDATA || '', 'Programs\\Python\\Python312\\Scripts\\yt-dlp.exe'),
    path_1.default.join(process.env.USERPROFILE || '', 'AppData\\Local\\Programs\\Python\\Python312\\Scripts\\yt-dlp.exe'),
    '/usr/local/bin/yt-dlp',
    '/usr/bin/yt-dlp',
    'yt-dlp.exe',
    'yt-dlp',
];
const FFMPEG_CANDIDATES = [
    ...(ffmpegStaticPath ? [ffmpegStaticPath] : []),
    'C:\\Users\\jogil\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-9.0.2-full_build\\bin\\ffmpeg.exe',
    'C:\\Program Files\\ffmpeg\\bin\\ffmpeg.exe',
    'C:\\Program Files (x86)\\ffmpeg\\bin\\ffmpeg.exe',
    path_1.default.join(process.env.LOCALAPPDATA || '', 'Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-9.0.2-full_build\\bin\\ffmpeg.exe'),
    '/usr/bin/ffmpeg',
    '/usr/local/bin/ffmpeg',
    'ffmpeg.exe',
    'ffmpeg',
];
const FFPROBE_CANDIDATES = [
    'C:\\Users\\jogil\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-9.0.2-full_build\\bin\\ffprobe.exe',
    'C:\\Program Files\\ffmpeg\\bin\\ffprobe.exe',
    path_1.default.join(process.env.LOCALAPPDATA || '', 'Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-9.0.2-full_build\\bin\\ffprobe.exe'),
    '/usr/bin/ffprobe',
    '/usr/local/bin/ffprobe',
    'ffprobe.exe',
    'ffprobe',
];
exports.YTDLP_PATH = findExecutable('yt-dlp', YTDLP_CANDIDATES);
exports.FFMPEG_PATH = findExecutable('ffmpeg', FFMPEG_CANDIDATES);
exports.FFPROBE_PATH = findExecutable('ffprobe', FFPROBE_CANDIDATES);
//# sourceMappingURL=config.js.map