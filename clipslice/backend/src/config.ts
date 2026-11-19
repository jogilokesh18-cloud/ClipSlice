import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';

// Resolve environment and paths
export const PORT = parseInt(process.env.PORT || '5000', 10);
export const TEMP_DIR = path.resolve(__dirname, '..', 'temp');
export const FILE_TTL_MS = 15 * 60 * 1000; // 15 minutes TTL

// Ensure temp directory exists
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

function findExecutable(name: string, candidatePaths: string[]): string {
  // Check env override first
  const envName = name.toUpperCase().replace(/[^A-Z0-9]/g, '_') + '_PATH';
  if (process.env[envName] && fs.existsSync(process.env[envName]!)) {
    return process.env[envName]!;
  }

  // Check PATH first via where/which
  try {
    const cmd = process.platform === 'win32' ? `where.exe ${name}` : `which ${name}`;
    const output = execSync(cmd, { stdio: ['pipe', 'pipe', 'ignore'], encoding: 'utf-8' }).trim();
    const firstLine = output.split(/\r?\n/)[0]?.trim();
    if (firstLine && fs.existsSync(firstLine)) {
      return firstLine;
    }
  } catch {
    // Ignore and proceed to candidates
  }

  // Check candidate paths
  for (const candidate of candidatePaths) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  // Default to naked command name for system PATH lookup
  return name;
}

const YTDLP_CANDIDATES = [
  'C:\\Users\\jogil\\AppData\\Local\\Programs\\Python\\Python312\\Scripts\\yt-dlp.exe',
  'C:\\Python312\\Scripts\\yt-dlp.exe',
  'C:\\Python311\\Scripts\\yt-dlp.exe',
  'C:\\Python310\\Scripts\\yt-dlp.exe',
  path.join(process.env.LOCALAPPDATA || '', 'Programs\\Python\\Python312\\Scripts\\yt-dlp.exe'),
  path.join(process.env.USERPROFILE || '', 'AppData\\Local\\Programs\\Python\\Python312\\Scripts\\yt-dlp.exe'),
  'yt-dlp.exe',
  'yt-dlp',
];

const FFMPEG_CANDIDATES = [
  'C:\\Users\\jogil\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-9.0.2-full_build\\bin\\ffmpeg.exe',
  'C:\\Program Files\\ffmpeg\\bin\\ffmpeg.exe',
  'C:\\Program Files (x86)\\ffmpeg\\bin\\ffmpeg.exe',
  path.join(process.env.LOCALAPPDATA || '', 'Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-9.0.2-full_build\\bin\\ffmpeg.exe'),
  'ffmpeg.exe',
  'ffmpeg',
];

const FFPROBE_CANDIDATES = [
  'C:\\Users\\jogil\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-9.0.2-full_build\\bin\\ffprobe.exe',
  'C:\\Program Files\\ffmpeg\\bin\\ffprobe.exe',
  path.join(process.env.LOCALAPPDATA || '', 'Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-9.0.2-full_build\\bin\\ffprobe.exe'),
  'ffprobe.exe',
  'ffprobe',
];

export const YTDLP_PATH = findExecutable('yt-dlp', YTDLP_CANDIDATES);
export const FFMPEG_PATH = findExecutable('ffmpeg', FFMPEG_CANDIDATES);
export const FFPROBE_PATH = findExecutable('ffprobe', FFPROBE_CANDIDATES);
