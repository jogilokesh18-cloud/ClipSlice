import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';
import { YTDLP_PATH, FFMPEG_PATH, TEMP_DIR } from './config';
import { jobManager } from './jobManager';
import { sanitizeFilename, formatSecondsToTime } from './timeUtils';

export interface ProcessClipOptions {
  jobId: string;
  url: string;
  title: string;
  startTime: number;
  endTime: number;
  format: 'mp4' | 'mp3';
  quality: string;
  mode?: 'fast' | 'accurate'; // 'fast' = lossless stream copy (1-2s), 'accurate' = keyframe re-encoded cut
}

export function startClipDownload(options: ProcessClipOptions): void {
  const { jobId, url, title, startTime, endTime, format, quality, mode = 'fast' } = options;
  const ext = format === 'mp3' ? 'mp3' : 'mp4';
  const outputFileName = `${jobId}.${ext}`;
  const outputPath = path.join(TEMP_DIR, outputFileName);
  const cleanDownloadName = sanitizeFilename(title, startTime, endTime, ext);

  // Initial stage
  jobManager.updateJob(jobId, {
    status: 'fetching',
    stage: 'Connecting to video source & locating stream fragments...',
    progress: 5,
    filename: cleanDownloadName,
    mimeType: format === 'mp3' ? 'audio/mpeg' : 'video/mp4',
  });

  const ffmpegDir = path.dirname(FFMPEG_PATH);
  const ffmpegLoc = (ffmpegDir && ffmpegDir !== '.' && fs.existsSync(ffmpegDir)) ? ffmpegDir : FFMPEG_PATH;

  // Construct arguments array for safe child_process.spawn (no shell execution)
  const args: string[] = [
    '--no-playlist',
    '--no-mtime',
    '--no-warnings',
    '--newline',
    '--ffmpeg-location', ffmpegLoc,
    // Node.js JS challenge solver: unlocks full 1080p, 1440p, 4K 60fps formats at high download speeds
    '--js-runtimes', 'node',
    // Parallel fragment downloads
    '--concurrent-fragments', '4',
    // Crucial: yt-dlp downloads ONLY the required time section
    '--download-sections', `*${startTime}-${endTime}`,
  ];

  // Cutting mode:
  // 'fast' (default) uses direct stream copy (-c copy) which finishes in seconds without CPU re-encoding.
  // 'accurate' forces keyframe cuts with ultrafast multi-threaded encoding at visually lossless quality.
  if (mode === 'accurate') {
    args.push('--force-keyframes-at-cuts');
    args.push('--downloader-args', 'ffmpeg_o:-preset ultrafast -crf 18 -threads 0');
    args.push('--postprocessor-args', 'ffmpeg:-preset ultrafast -crf 18 -threads 0');
  } else {
    // Ultrafast stream copy / remux
    args.push('--downloader-args', 'ffmpeg_o:-threads 0');
    args.push('--postprocessor-args', 'ffmpeg:-threads 0');
  }

  // Format and quality selection
  if (format === 'mp3') {
    args.push(
      '-x',
      '--audio-format', 'mp3',
      '--audio-quality', '0',
      '--output', outputPath
    );
  } else {
    // High-resolution video selection
    const cleanQuality = quality.toLowerCase().trim();
    let formatFilter = 'bv*+ba/best';

    if (cleanQuality === 'best') {
      formatFilter = 'bv*+ba/best';
    } else {
      const match = cleanQuality.match(/(\d+)/);
      if (match) {
        const targetHeight = parseInt(match[1], 10);
        if (targetHeight <= 1080) {
          // For <= 1080p, prioritize AVC1 (H.264) + AAC for universal browser playback & instant remuxing,
          // then cleanly fallback to any video stream up to this resolution
          formatFilter = `bv*[height<=${targetHeight}][vcodec^=avc1]+ba[acodec^=mp4a]/bv*[height<=${targetHeight}][ext=mp4]+ba[ext=m4a]/bv*[height<=${targetHeight}]+ba/b[height<=${targetHeight}]/best`;
        } else {
          // For > 1080p (e.g. 1440p, 2160p / 4K)
          formatFilter = `bv*[height<=${targetHeight}]+ba/b[height<=${targetHeight}]/best`;
        }
      } else {
        formatFilter = 'bv*[vcodec^=avc1]+ba[acodec^=mp4a]/bv*+ba/best';
      }
    }

    args.push(
      '-f', formatFilter,
      '--merge-output-format', 'mp4',
      '--output', outputPath
    );
  }

  // Progress template for real-time parsing
  args.push(
    '--progress-template',
    'download:[PROGRESS]:%(progress._percent_str)s|%(progress._speed_str)s|%(progress._eta_str)s'
  );

  // Target video URL
  args.push(url);

  console.log(`[Downloader] Starting job ${jobId} (${mode.toUpperCase()} mode): clipping ${formatSecondsToTime(startTime)} to ${formatSecondsToTime(endTime)}`);

  const child: ChildProcess = spawn(YTDLP_PATH, args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: false,
  });

  jobManager.setChildProcess(jobId, child);

  let stderrBuffer = '';

  child.stdout?.on('data', (data: Buffer) => {
    const text = data.toString('utf-8');
    const lines = text.split(/\r?\n/);

    for (const line of lines) {
      if (line.includes('[PROGRESS]:')) {
        const parts = line.split('[PROGRESS]:')[1]?.split('|');
        if (parts && parts.length >= 3) {
          const rawPercent = parts[0].replace('%', '').trim();
          const speed = parts[1].trim();
          const eta = parts[2].trim();
          const parsedPercent = parseFloat(rawPercent);

          if (!isNaN(parsedPercent)) {
            // Map download percentage (0-100) to overall progress (10-85)
            const overallProgress = 10 + (parsedPercent * 0.75);
            jobManager.updateJob(jobId, {
              status: 'downloading',
              stage: `Downloading segment (${Math.round(parsedPercent)}%)...`,
              progress: Math.min(85, overallProgress),
              speed: speed !== 'NA' ? speed : undefined,
              eta: eta !== 'NA' ? eta : undefined,
            });
          }
        }
      } else if (
        line.includes('[Merger]') ||
        line.includes('[Fixup') ||
        line.includes('[ExtractAudio]') ||
        line.includes('[VideoConvertor]') ||
        line.includes('Stream mapping:')
      ) {
        jobManager.updateJob(jobId, {
          status: 'processing',
          stage: mode === 'fast' ? 'Remuxing audio & video streams...' : 'Slicing & remuxing video with FFmpeg...',
          progress: 90,
          speed: undefined,
          eta: undefined,
        });
      }
    }
  });

  child.stderr?.on('data', (data: Buffer) => {
    const text = data.toString('utf-8');
    stderrBuffer += text;
    if (text.includes('[download]') && text.includes('%')) {
      const match = text.match(/([0-9.]+)%/);
      if (match) {
        const percent = parseFloat(match[1]);
        if (!isNaN(percent)) {
          jobManager.updateJob(jobId, {
            status: 'downloading',
            stage: `Downloading segment (${Math.round(percent)}%)...`,
            progress: Math.min(85, 10 + percent * 0.75),
          });
        }
      }
    }
  });

  child.on('error', (err) => {
    console.error(`[Downloader] Job ${jobId} process error:`, err);
    jobManager.updateJob(jobId, {
      status: 'error',
      stage: 'Failed to execute video processor',
      error: `Process error: ${err.message}`,
    });
  });

  child.on('close', (code) => {
    if (code !== 0) {
      console.error(`[Downloader] Job ${jobId} failed with exit code ${code}`);
      const lines = stderrBuffer.trim().split('\n').filter(Boolean);
      let errorMsg = lines.length > 0 ? lines[lines.length - 1] : `Process failed with exit code ${code}`;

      if (errorMsg.includes('Requested format is not available')) {
        errorMsg = 'Selected video resolution is not available for this video. Try selecting "Best" or a lower resolution.';
      } else if (errorMsg.includes('Section') && errorMsg.includes('out of range')) {
        errorMsg = 'Requested time section is out of range for this video.';
      }

      jobManager.updateJob(jobId, {
        status: 'error',
        stage: 'Download/Trimming failed',
        error: errorMsg,
      });
      return;
    }

    // Check if the expected output file exists
    let finalPath = outputPath;
    if (!fs.existsSync(finalPath)) {
      const candidates = fs.readdirSync(TEMP_DIR).filter(f => f.startsWith(jobId));
      if (candidates.length > 0) {
        finalPath = path.join(TEMP_DIR, candidates[0]);
      } else {
        jobManager.updateJob(jobId, {
          status: 'error',
          stage: 'Trimmed output file could not be found.',
          error: 'Processed clip file was not generated.',
        });
        return;
      }
    }

    try {
      const stat = fs.statSync(finalPath);
      if (stat.size === 0) {
        jobManager.updateJob(jobId, {
          status: 'error',
          stage: 'Generated clip is empty.',
          error: 'The generated clip file has 0 bytes. Please verify timestamps.',
        });
        return;
      }

      jobManager.updateJob(jobId, {
        status: 'completed',
        stage: 'Clip ready to preview and download!',
        progress: 100,
        outputFile: finalPath,
        filename: cleanDownloadName,
        fileSize: stat.size,
        mimeType: ext === 'mp3' ? 'audio/mpeg' : 'video/mp4',
        completedAt: Date.now(),
      });
      console.log(`[Downloader] Job ${jobId} successfully completed! File: ${finalPath} (${(stat.size / 1024 / 1024).toFixed(2)} MB)`);
    } catch (statErr) {
      jobManager.updateJob(jobId, {
        status: 'error',
        stage: 'Error checking generated clip file.',
        error: statErr instanceof Error ? statErr.message : String(statErr),
      });
    }
  });
}
