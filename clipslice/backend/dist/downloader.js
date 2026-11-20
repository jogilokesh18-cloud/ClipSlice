"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startClipDownload = startClipDownload;
const child_process_1 = require("child_process");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const config_1 = require("./config");
const jobManager_1 = require("./jobManager");
const timeUtils_1 = require("./timeUtils");
function startClipDownload(options) {
    const { jobId, url, title, startTime, endTime, format, quality, mode = 'fast' } = options;
    const ext = format === 'mp3' ? 'mp3' : 'mp4';
    const outputFileName = `${jobId}.${ext}`;
    const outputPath = path_1.default.join(config_1.TEMP_DIR, outputFileName);
    const cleanDownloadName = (0, timeUtils_1.sanitizeFilename)(title, startTime, endTime, ext);
    // Initial stage
    jobManager_1.jobManager.updateJob(jobId, {
        status: 'fetching',
        stage: 'Connecting to video source & locating stream fragments...',
        progress: 5,
        filename: cleanDownloadName,
        mimeType: format === 'mp3' ? 'audio/mpeg' : 'video/mp4',
    });
    const ffmpegLoc = config_1.FFMPEG_PATH;
    // Check for cookies file or environment variable (bypasses YouTube datacenter bot detection)
    const possibleCookiePaths = [
        path_1.default.join(__dirname, '..', 'cookies.txt'),
        path_1.default.join(process.cwd(), 'cookies.txt'),
        path_1.default.join(process.cwd(), 'clipslice', 'backend', 'cookies.txt'),
    ];
    let cookiePath = possibleCookiePaths.find((p) => fs_1.default.existsSync(p));
    if (!cookiePath && process.env.YTDLP_COOKIES) {
        try {
            const envCookieFile = path_1.default.join(config_1.TEMP_DIR, 'cookies_env.txt');
            fs_1.default.writeFileSync(envCookieFile, process.env.YTDLP_COOKIES, 'utf-8');
            cookiePath = envCookieFile;
        }
        catch {
            // ignore
        }
    }
    // Construct arguments array for safe child_process.spawn (no shell execution)
    const args = [
        '--no-playlist',
        '--no-mtime',
        '--no-warnings',
        '--newline',
        '--ffmpeg-location', ffmpegLoc,
        // Node.js JS challenge solver: unlocks full 1080p, 1440p, 4K 60fps formats at high download speeds
        '--js-runtimes', 'node',
        // Fallback player clients for YouTube cloud datacenter extraction
        '--extractor-args', 'youtube:player_client=default,ios,android,web',
        '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        // Parallel fragment downloads
        '--concurrent-fragments', '4',
        // Crucial: yt-dlp downloads ONLY the required time section
        '--download-sections', `*${startTime}-${endTime}`,
    ];
    if (cookiePath) {
        args.push('--cookies', cookiePath);
    }
    // Cutting mode:
    // 'fast' (default) uses direct stream copy (-c copy) which finishes in seconds without CPU re-encoding.
    // 'accurate' forces keyframe cuts with ultrafast multi-threaded encoding at visually lossless quality.
    if (mode === 'accurate') {
        args.push('--force-keyframes-at-cuts');
        args.push('--downloader-args', 'ffmpeg_o:-preset ultrafast -crf 18 -threads 0');
        args.push('--postprocessor-args', 'ffmpeg:-preset ultrafast -crf 18 -threads 0');
    }
    else {
        // Ultrafast stream copy / remux
        args.push('--downloader-args', 'ffmpeg_o:-threads 0');
        args.push('--postprocessor-args', 'ffmpeg:-threads 0');
    }
    // Format and quality selection
    if (format === 'mp3') {
        args.push('-x', '--audio-format', 'mp3', '--audio-quality', '0', '--output', outputPath);
    }
    else {
        // High-resolution video selection
        const cleanQuality = quality.toLowerCase().trim();
        let formatFilter = 'bv*+ba/best';
        if (cleanQuality === 'best') {
            formatFilter = 'bv*+ba/best';
        }
        else {
            const match = cleanQuality.match(/(\d+)/);
            if (match) {
                const targetHeight = parseInt(match[1], 10);
                if (targetHeight <= 1080) {
                    // For <= 1080p, prioritize AVC1 (H.264) + AAC for universal browser playback & instant remuxing,
                    // then cleanly fallback to any video stream up to this resolution
                    formatFilter = `bv*[height<=${targetHeight}][vcodec^=avc1]+ba[acodec^=mp4a]/bv*[height<=${targetHeight}][ext=mp4]+ba[ext=m4a]/bv*[height<=${targetHeight}]+ba/b[height<=${targetHeight}]/best`;
                }
                else {
                    // For > 1080p (e.g. 1440p, 2160p / 4K)
                    formatFilter = `bv*[height<=${targetHeight}]+ba/b[height<=${targetHeight}]/best`;
                }
            }
            else {
                formatFilter = 'bv*[vcodec^=avc1]+ba[acodec^=mp4a]/bv*+ba/best';
            }
        }
        args.push('-f', formatFilter, '--merge-output-format', 'mp4', '--output', outputPath);
    }
    // Progress template for real-time parsing
    args.push('--progress-template', 'download:[PROGRESS]:%(progress._percent_str)s|%(progress._speed_str)s|%(progress._eta_str)s');
    // Target video URL
    args.push(url);
    console.log(`[Downloader] Starting job ${jobId} (${mode.toUpperCase()} mode): clipping ${(0, timeUtils_1.formatSecondsToTime)(startTime)} to ${(0, timeUtils_1.formatSecondsToTime)(endTime)}`);
    let child;
    try {
        child = (0, child_process_1.spawn)(config_1.YTDLP_PATH, args, {
            stdio: ['ignore', 'pipe', 'pipe'],
            shell: false,
        });
    }
    catch (spawnErr) {
        const errMsg = spawnErr instanceof Error ? spawnErr.message : 'Failed to launch yt-dlp';
        console.error('[Downloader Spawn Error]:', errMsg);
        jobManager_1.jobManager.updateJob(jobId, {
            status: 'error',
            stage: 'Failed to launch downloader',
            error: errMsg,
        });
        return;
    }
    jobManager_1.jobManager.setChildProcess(jobId, child);
    let stderrBuffer = '';
    child.stdout?.on('data', (data) => {
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
                        jobManager_1.jobManager.updateJob(jobId, {
                            status: 'downloading',
                            stage: `Downloading segment (${Math.round(parsedPercent)}%)...`,
                            progress: Math.min(85, overallProgress),
                            speed: speed !== 'NA' ? speed : undefined,
                            eta: eta !== 'NA' ? eta : undefined,
                        });
                    }
                }
            }
            else if (line.includes('[Merger]') ||
                line.includes('[Fixup') ||
                line.includes('[ExtractAudio]') ||
                line.includes('[VideoConvertor]') ||
                line.includes('Stream mapping:')) {
                jobManager_1.jobManager.updateJob(jobId, {
                    status: 'processing',
                    stage: mode === 'fast' ? 'Remuxing audio & video streams...' : 'Slicing & remuxing video with FFmpeg...',
                    progress: 90,
                    speed: undefined,
                    eta: undefined,
                });
            }
        }
    });
    child.stderr?.on('data', (data) => {
        const text = data.toString('utf-8');
        stderrBuffer += text;
        if (text.includes('[download]') && text.includes('%')) {
            const match = text.match(/([0-9.]+)%/);
            if (match) {
                const percent = parseFloat(match[1]);
                if (!isNaN(percent)) {
                    jobManager_1.jobManager.updateJob(jobId, {
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
        jobManager_1.jobManager.updateJob(jobId, {
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
            }
            else if (errorMsg.includes('Section') && errorMsg.includes('out of range')) {
                errorMsg = 'Requested time section is out of range for this video.';
            }
            else if (errorMsg.includes('Failed to extract any player response') ||
                errorMsg.includes('Sign in to confirm') ||
                errorMsg.includes('bot') ||
                errorMsg.includes('HTTP Error 429')) {
                errorMsg = 'YouTube has temporarily rate-limited automated downloads from this cloud server IP. To slice this video without limits, run ClipSlice locally on your computer via start.bat (residential IPs are never blocked), or configure a YouTube cookies file.';
            }
            jobManager_1.jobManager.updateJob(jobId, {
                status: 'error',
                stage: 'Download/Trimming failed',
                error: errorMsg,
            });
            return;
        }
        // Check if the expected output file exists
        let finalPath = outputPath;
        if (!fs_1.default.existsSync(finalPath)) {
            const candidates = fs_1.default.readdirSync(config_1.TEMP_DIR).filter(f => f.startsWith(jobId));
            if (candidates.length > 0) {
                finalPath = path_1.default.join(config_1.TEMP_DIR, candidates[0]);
            }
            else {
                jobManager_1.jobManager.updateJob(jobId, {
                    status: 'error',
                    stage: 'Trimmed output file could not be found.',
                    error: 'Processed clip file was not generated.',
                });
                return;
            }
        }
        try {
            const stat = fs_1.default.statSync(finalPath);
            if (stat.size === 0) {
                jobManager_1.jobManager.updateJob(jobId, {
                    status: 'error',
                    stage: 'Generated clip is empty.',
                    error: 'The generated clip file has 0 bytes. Please verify timestamps.',
                });
                return;
            }
            jobManager_1.jobManager.updateJob(jobId, {
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
        }
        catch (statErr) {
            jobManager_1.jobManager.updateJob(jobId, {
                status: 'error',
                stage: 'Error checking generated clip file.',
                error: statErr instanceof Error ? statErr.message : String(statErr),
            });
        }
    });
}
//# sourceMappingURL=downloader.js.map