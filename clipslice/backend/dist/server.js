"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const uuid_1 = require("uuid");
const config_1 = require("./config");
const urlValidator_1 = require("./urlValidator");
const timeUtils_1 = require("./timeUtils");
const metadata_1 = require("./metadata");
const jobManager_1 = require("./jobManager");
const downloader_1 = require("./downloader");
const app = (0, express_1.default)();
// Trust reverse proxy (Render, Railway, Vercel, Nginx, Cloudflare)
app.set('trust proxy', 1);
// Enable CORS
app.use((0, cors_1.default)({
    origin: '*',
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Range', 'Authorization'],
    exposedHeaders: ['Content-Range', 'Accept-Ranges', 'Content-Length', 'Content-Disposition'],
}));
app.use(express_1.default.json());
/**
 * Health check & diagnostic endpoint
 */
app.get('/api/health', (_req, res) => {
    let tempFilesCount = 0;
    try {
        if (fs_1.default.existsSync(config_1.TEMP_DIR)) {
            tempFilesCount = fs_1.default.readdirSync(config_1.TEMP_DIR).length;
        }
    }
    catch {
        // ignore
    }
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        tools: {
            ytdlp: config_1.YTDLP_PATH,
            ffmpeg: config_1.FFMPEG_PATH,
            ffprobe: config_1.FFPROBE_PATH,
        },
        tempDirectory: {
            path: config_1.TEMP_DIR,
            activeFiles: tempFilesCount,
        },
    });
});
/**
 * POST /api/metadata
 * Fetches video metadata without downloading video
 */
app.post('/api/metadata', async (req, res) => {
    try {
        const { url } = req.body;
        if (!url || typeof url !== 'string') {
            return res.status(400).json({ success: false, error: 'Video URL is required.' });
        }
        const metadata = await (0, metadata_1.fetchVideoMetadata)(url);
        return res.json({ success: true, metadata });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch video information.';
        console.error('[Metadata Error]:', message);
        return res.status(400).json({ success: false, error: message });
    }
});
/**
 * POST /api/clip
 * Initiates the download-and-cut of the requested segment
 */
app.post('/api/clip', async (req, res) => {
    try {
        const { url, startTime, endTime, format = 'mp4', quality = 'best', title, mode = 'fast' } = req.body;
        if (!url || typeof url !== 'string') {
            return res.status(400).json({ success: false, error: 'A valid video URL is required.' });
        }
        // Validate URL syntax and security (SSRF check)
        const validated = (0, urlValidator_1.validateVideoUrl)(url);
        // Validate and parse time inputs
        const startSec = (0, timeUtils_1.parseTimeToSeconds)(startTime);
        const endSec = (0, timeUtils_1.parseTimeToSeconds)(endTime);
        const timeValidation = (0, timeUtils_1.validateTimeRange)(startSec, endSec);
        if (!timeValidation.valid) {
            return res.status(400).json({ success: false, error: timeValidation.error });
        }
        const chosenFormat = format.toLowerCase() === 'mp3' ? 'mp3' : 'mp4';
        const chosenQuality = quality || 'best';
        const chosenMode = mode === 'accurate' ? 'accurate' : 'fast';
        const clipTitle = (typeof title === 'string' && title.trim()) ? title.trim() : 'Clip';
        const jobId = (0, uuid_1.v4)();
        // Create job entry in job manager
        jobManager_1.jobManager.createJob({
            id: jobId,
            url: validated.normalized,
            title: clipTitle,
            startTime: startSec,
            endTime: endSec,
            format: chosenFormat,
            quality: chosenQuality,
        });
        // Start background process
        (0, downloader_1.startClipDownload)({
            jobId,
            url: validated.normalized,
            title: clipTitle,
            startTime: startSec,
            endTime: endSec,
            format: chosenFormat,
            quality: chosenQuality,
            mode: chosenMode,
        });
        return res.json({
            success: true,
            jobId,
            message: `Started slicing clip from ${(0, timeUtils_1.formatSecondsToTime)(startSec)} to ${(0, timeUtils_1.formatSecondsToTime)(endSec)}.`,
        });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to initiate video clip processing.';
        console.error('[Clip Request Error]:', message);
        return res.status(400).json({ success: false, error: message });
    }
});
/**
 * GET /api/progress/:jobId
 * Server-Sent Events (SSE) endpoint for live streaming progress
 */
app.get('/api/progress/:jobId', (req, res) => {
    const { jobId } = req.params;
    const job = jobManager_1.jobManager.getJob(jobId);
    if (!job) {
        return res.status(404).json({ success: false, error: 'Job not found.' });
    }
    // Set SSE Headers
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
    });
    res.write('\n');
    // Register client
    jobManager_1.jobManager.subscribe(jobId, res);
    // Keep-alive heartbeat every 15 seconds
    const heartbeat = setInterval(() => {
        try {
            res.write(': keepalive\n\n');
        }
        catch {
            clearInterval(heartbeat);
        }
    }, 15000);
    req.on('close', () => {
        clearInterval(heartbeat);
    });
});
/**
 * GET /api/job/:jobId
 * JSON polling fallback for job status
 */
app.get('/api/job/:jobId', (req, res) => {
    const { jobId } = req.params;
    const job = jobManager_1.jobManager.getJob(jobId);
    if (!job) {
        return res.status(404).json({ success: false, error: 'Job not found or expired.' });
    }
    return res.json({
        success: true,
        job: {
            id: job.id,
            status: job.status,
            progress: Math.min(100, Math.max(0, Math.round(job.progress))),
            stage: job.stage,
            speed: job.speed,
            eta: job.eta,
            filename: job.filename,
            fileSize: job.fileSize,
            mimeType: job.mimeType,
            error: job.error,
        },
    });
});
/**
 * GET /api/stream/:jobId
 * In-browser preview player streaming with HTTP 206 Partial Content support
 */
app.get('/api/stream/:jobId', (req, res) => {
    const { jobId } = req.params;
    const job = jobManager_1.jobManager.getJob(jobId);
    if (!job || !job.outputFile || !fs_1.default.existsSync(job.outputFile)) {
        return res.status(404).json({ success: false, error: 'Clip file is not ready or has expired.' });
    }
    const filePath = job.outputFile;
    const stat = fs_1.default.statSync(filePath);
    const fileSize = stat.size;
    const mimeType = job.mimeType || 'video/mp4';
    const range = req.headers.range;
    if (range) {
        // Range request for in-browser video/audio seeking
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        if (start >= fileSize || end >= fileSize) {
            res.status(416).set({
                'Content-Range': `bytes */${fileSize}`,
            });
            return res.end();
        }
        const chunksize = end - start + 1;
        const fileStream = fs_1.default.createReadStream(filePath, { start, end });
        res.writeHead(206, {
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunksize,
            'Content-Type': mimeType,
        });
        fileStream.pipe(res);
    }
    else {
        res.writeHead(200, {
            'Content-Length': fileSize,
            'Content-Type': mimeType,
            'Accept-Ranges': 'bytes',
        });
        fs_1.default.createReadStream(filePath).pipe(res);
    }
});
/**
 * GET /api/download/:jobId
 * Direct file download with attachment header
 */
app.get('/api/download/:jobId', (req, res) => {
    const { jobId } = req.params;
    const job = jobManager_1.jobManager.getJob(jobId);
    if (!job || !job.outputFile || !fs_1.default.existsSync(job.outputFile)) {
        return res.status(404).json({ success: false, error: 'Requested clip file does not exist or has expired.' });
    }
    const filename = job.filename || `ClipSlice_${jobId}.${job.format}`;
    res.download(job.outputFile, filename, (err) => {
        if (err) {
            console.error(`[Download Error] Failed to send file for job ${jobId}:`, err);
        }
    });
});
/**
 * DELETE /api/job/:jobId
 * Cancels or cleans up a job
 */
app.delete('/api/job/:jobId', (req, res) => {
    const { jobId } = req.params;
    const success = jobManager_1.jobManager.cancelJob(jobId);
    return res.json({ success });
});
// Serve frontend static build if available across various cloud hosting layouts
const candidateDistPaths = [
    path_1.default.resolve(__dirname, '../../frontend/dist'),
    path_1.default.resolve(process.cwd(), 'dist'),
    path_1.default.resolve(process.cwd(), 'clipslice/frontend/dist'),
    path_1.default.resolve(__dirname, '../../../dist'),
    path_1.default.resolve(process.cwd(), 'cut'),
];
const frontendDistPath = candidateDistPaths.find(p => fs_1.default.existsSync(p) && fs_1.default.existsSync(path_1.default.join(p, 'index.html')));
if (frontendDistPath) {
    console.log(`[Static] Serving frontend from: ${frontendDistPath}`);
    app.use(express_1.default.static(frontendDistPath));
    app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api')) {
            return next();
        }
        const indexHtml = path_1.default.join(frontendDistPath, 'index.html');
        if (fs_1.default.existsSync(indexHtml)) {
            return res.sendFile(indexHtml);
        }
        next();
    });
}
// 404 handler for unmatched API routes
app.use((_req, res) => {
    res.status(404).json({ success: false, error: 'Endpoint not found.' });
});
// Global error handler
app.use((err, _req, res, _next) => {
    const message = err instanceof Error ? err.message : 'Internal server error occurred.';
    console.error('[Unhandled Server Error]:', err);
    res.status(500).json({
        success: false,
        error: message,
    });
});
const server = app.listen(config_1.PORT, '0.0.0.0', () => {
    console.log(`===============================================`);
    console.log(`  ClipSlice Full-Stack Server`);
    console.log(`  Running on: http://localhost:${config_1.PORT}`);
    console.log(`  yt-dlp:  ${config_1.YTDLP_PATH}`);
    console.log(`  ffmpeg:  ${config_1.FFMPEG_PATH}`);
    console.log(`  temp dir:${config_1.TEMP_DIR}`);
    console.log(`===============================================`);
});
// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\nGracefully shutting down ClipSlice server...');
    jobManager_1.jobManager.destroy();
    server.close(() => {
        process.exit(0);
    });
});
//# sourceMappingURL=server.js.map