import { spawn } from 'child_process';
import { YTDLP_PATH } from './config';
import { validateVideoUrl, ValidatedUrl } from './urlValidator';

export interface ResolutionOption {
  label: string; // e.g. '1080p', '720p', '480p', 'Best'
  height: number;
  formatId?: string;
  hasAudio?: boolean;
}

export interface VideoMetadata {
  title: string;
  thumbnail: string;
  duration: number; // in seconds
  uploader: string;
  platform: string;
  displayPlatform: string;
  url: string;
  resolutions: ResolutionOption[];
}

interface YtDlpFormat {
  format_id?: string;
  height?: number;
  width?: number;
  fps?: number;
  vcodec?: string;
  acodec?: string;
  ext?: string;
  filesize?: number;
}

interface YtDlpOutput {
  title?: string;
  thumbnail?: string;
  thumbnails?: Array<{ url: string; width?: number; height?: number; preference?: number }>;
  duration?: number;
  uploader?: string;
  channel?: string;
  creator?: string;
  formats?: YtDlpFormat[];
}

function extractResolutions(formats?: YtDlpFormat[]): ResolutionOption[] {
  if (!formats || formats.length === 0) {
    return [
      { label: 'Best', height: 1080 },
      { label: '1080p', height: 1080 },
      { label: '720p', height: 720 },
      { label: '480p', height: 480 },
    ];
  }

  const heightsMap = new Map<number, { formatId: string; hasAudio: boolean }>();

  for (const f of formats) {
    if (!f.height || f.height <= 0) continue;
    // skip video codecs that are 'none' (audio-only streams)
    if (f.vcodec === 'none') continue;

    const hasAudio = !!f.acodec && f.acodec !== 'none';
    const existing = heightsMap.get(f.height);
    if (!existing || (!existing.hasAudio && hasAudio)) {
      heightsMap.set(f.height, {
        formatId: f.format_id || '',
        hasAudio,
      });
    }
  }

  const heights = Array.from(heightsMap.keys()).sort((a, b) => b - a);
  const result: ResolutionOption[] = [];

  // Always include 'Best' at the top
  result.push({
    label: 'Best',
    height: heights.length > 0 ? heights[0] : 1080,
    formatId: heights.length > 0 ? heightsMap.get(heights[0])?.formatId : undefined,
  });

  // Common target heights to highlight if available or close
  const standardTargets = [2160, 1440, 1080, 720, 480, 360];
  const addedHeights = new Set<number>();

  for (const h of heights) {
    // Only pick heights that match or are close to standard, or if fewer resolutions
    if (standardTargets.includes(h) || heights.length <= 6) {
      if (!addedHeights.has(h)) {
        addedHeights.add(h);
        const item = heightsMap.get(h)!;
        result.push({
          label: `${h}p`,
          height: h,
          formatId: item.formatId,
          hasAudio: item.hasAudio,
        });
      }
    }
  }

  // Fallback defaults if list is empty
  if (result.length <= 1) {
    result.push(
      { label: '1080p', height: 1080 },
      { label: '720p', height: 720 },
      { label: '480p', height: 480 }
    );
  }

  return result;
}

function selectBestThumbnail(data: YtDlpOutput): string {
  if (data.thumbnail && typeof data.thumbnail === 'string') {
    return data.thumbnail;
  }
  if (Array.isArray(data.thumbnails) && data.thumbnails.length > 0) {
    // Pick the last thumbnail (usually highest resolution)
    const valid = data.thumbnails.filter(t => !!t.url);
    if (valid.length > 0) {
      return valid[valid.length - 1].url;
    }
  }
  return '';
}

export async function fetchVideoMetadata(rawUrl: string): Promise<VideoMetadata> {
  const validated: ValidatedUrl = validateVideoUrl(rawUrl);

  return new Promise((resolve, reject) => {
    const args = [
      '--dump-single-json',
      '--no-download',
      '--no-warnings',
      '--no-playlist',
      '--skip-download',
      '--js-runtimes', 'node',
      validated.normalized,
    ];

    const child = spawn(YTDLP_PATH, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: false,
    });

    let stdout = '';
    let stderr = '';
    let timedOut = false;

    const timeout = setTimeout(() => {
      timedOut = true;
      try {
        child.kill('SIGTERM');
      } catch {
        // ignore
      }
      reject(new Error('Fetching video metadata timed out after 30 seconds.'));
    }, 30000);

    child.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString('utf-8');
    });

    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString('utf-8');
    });

    child.on('error', (err) => {
      clearTimeout(timeout);
      if (timedOut) return;
      reject(new Error(`Failed to start yt-dlp process: ${err.message}`));
    });

    child.on('close', (code) => {
      clearTimeout(timeout);
      if (timedOut) return;

      if (code !== 0) {
        const errorLines = stderr.trim().split('\n').filter(Boolean);
        const lastError = errorLines.length > 0 ? errorLines[errorLines.length - 1] : `Process exited with code ${code}`;
        
        let friendlyMessage = lastError.replace(/^ERROR:\s*/i, '');
        if (friendlyMessage.includes('Private video') || friendlyMessage.includes('Sign in')) {
          friendlyMessage = 'This video is private, restricted, or requires login.';
        } else if (friendlyMessage.includes('Video unavailable') || friendlyMessage.includes('not found')) {
          friendlyMessage = 'Video is unavailable or has been removed.';
        } else if (friendlyMessage.includes('getaddrinfo failed') || friendlyMessage.includes('Network is unreachable')) {
          friendlyMessage = 'Network connection failed while reaching video source.';
        }
        
        return reject(new Error(friendlyMessage));
      }

      try {
        const parsed: YtDlpOutput = JSON.parse(stdout);
        const duration = Math.round(Number(parsed.duration) || 0);

        const metadata: VideoMetadata = {
          title: (parsed.title || 'Untitled Video').trim(),
          thumbnail: selectBestThumbnail(parsed),
          duration,
          uploader: parsed.uploader || parsed.channel || parsed.creator || validated.displayPlatform,
          platform: validated.platform,
          displayPlatform: validated.displayPlatform,
          url: validated.normalized,
          resolutions: extractResolutions(parsed.formats),
        };

        resolve(metadata);
      } catch (parseErr) {
        reject(new Error(`Failed to parse video metadata: ${parseErr instanceof Error ? parseErr.message : String(parseErr)}`));
      }
    });
  });
}
