import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import rateLimit from 'express-rate-limit';
import { PORT, TEMP_DIR, YTDLP_PATH, FFMPEG_PATH, FFPROBE_PATH } from './config';
import { validateVideoUrl } from './urlValidator';
import { parseTimeToSeconds, validateTimeRange, formatSecondsToTime } from './timeUtils';
import { fetchVideoMetadata } from './metadata';
import { jobManager } from './jobManager';
import { startClipDownload } from './downloader';

const app = express();

// Enable CORS
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Range', 'Authorization'],
  exposedHeaders: ['Content-Range', 'Accept-Ranges', 'Content-Length', 'Content-Disposition'],
}));

app.use(express.json());

// Global Rate Limiter: 100 requests per minute
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { success: false, error: 'Too many requests. Please slow down and try again shortly.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(globalLimiter);

// Specific Rate Limiter for clip processing jobs: 15 clips per 10 minutes per IP
const clipLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 15,
  message: { success: false, error: 'Clip processing rate limit exceeded. Please wait a few minutes before slicing more clips.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Health check & diagnostic endpoint
 */
app.get('/api/health', (_req: Request, res: Response) => {
  let tempFilesCount = 0;
  try {
    if (fs.existsSync(TEMP_DIR)) {
      tempFilesCount = fs.readdirSync(TEMP_DIR).length;
    }
  } catch {
    // ignore
  }

  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    tools: {
      ytdlp: YTDLP_PATH,
      ffmpeg: FFMPEG_PATH,
      ffprobe: FFPROBE_PATH,
    },
    tempDirectory: {
      path: TEMP_DIR,
      activeFiles: tempFilesCount,
    },
  });
});

/**
 * POST /api/metadata
 * Fetches video metadata without downloading video
 */
app.post('/api/metadata', async (req: Request, res: Response) => {
  try {
    const { url } = req.body;
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ success: false, error: 'Video URL is required.' });
    }

    const metadata = await fetchVideoMetadata(url);
    return res.json({ success: true, metadata });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch video information.';
    console.error('[Metadata Error]:', message);
    return res.status(400).json({ success: false, error: message });
  }
});

/**
 * POST /api/clip
 * Initiates the download-and-cut of the requested segment
 */
app.post('/api/clip', clipLimiter, async (req: Request, res: Response) => {
  try {
    const { url, startTime, endTime, format = 'mp4', quality = 'best', title, mode = 'fast' } = req.body;

    if (!url || typeof url !== 'string') {
      return res.status(400).json({ success: false, error: 'A valid video URL is required.' });
    }

    // Validate URL syntax and security (SSRF check)
    const validated = validateVideoUrl(url);

    // Validate and parse time inputs
    const startSec = parseTimeToSeconds(startTime);
    const endSec = parseTimeToSeconds(endTime);

    const timeValidation = validateTimeRange(startSec, endSec);
    if (!timeValidation.valid) {
      return res.status(400).json({ success: false, error: timeValidation.error });
    }

    const chosenFormat: 'mp4' | 'mp3' = format.toLowerCase() === 'mp3' ? 'mp3' : 'mp4';
    const chosenQuality: string = quality || 'best';
    const chosenMode: 'fast' | 'accurate' = mode === 'accurate' ? 'accurate' : 'fast';
    const clipTitle = (typeof title === 'string' && title.trim()) ? title.trim() : 'Clip';

    const jobId = uuidv4();

    // Create job entry in job manager
    jobManager.createJob({
      id: jobId,
      url: validated.normalized,
      title: clipTitle,
      startTime: startSec,
      endTime: endSec,
      format: chosenFormat,
      quality: chosenQuality,
    });

    // Start background process
    startClipDownload({
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
      message: `Started slicing clip from ${formatSecondsToTime(startSec)} to ${formatSecondsToTime(endSec)}.`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to initiate video clip processing.';
    console.error('[Clip Request Error]:', message);
    return res.status(400).json({ success: false, error: message });
  }
});

/**
 * GET /api/progress/:jobId
 * Server-Sent Events (SSE) endpoint for live streaming progress
 */
app.get('/api/progress/:jobId', (req: Request, res: Response) => {
  const { jobId } = req.params;
  const job = jobManager.getJob(jobId);

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
  jobManager.subscribe(jobId, res);

  // Keep-alive heartbeat every 15 seconds
  const heartbeat = setInterval(() => {
    try {
      res.write(': keepalive\n\n');
    } catch {
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
app.get('/api/job/:jobId', (req: Request, res: Response) => {
  const { jobId } = req.params;
  const job = jobManager.getJob(jobId);

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
app.get('/api/stream/:jobId', (req: Request, res: Response) => {
  const { jobId } = req.params;
  const job = jobManager.getJob(jobId);

  if (!job || !job.outputFile || !fs.existsSync(job.outputFile)) {
    return res.status(404).json({ success: false, error: 'Clip file is not ready or has expired.' });
  }

  const filePath = job.outputFile;
  const stat = fs.statSync(filePath);
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
    const fileStream = fs.createReadStream(filePath, { start, end });

    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': mimeType,
    });

    fileStream.pipe(res);
  } else {
    res.writeHead(200, {
      'Content-Length': fileSize,
      'Content-Type': mimeType,
      'Accept-Ranges': 'bytes',
    });

    fs.createReadStream(filePath).pipe(res);
  }
});

/**
 * GET /api/download/:jobId
 * Direct file download with attachment header
 */
app.get('/api/download/:jobId', (req: Request, res: Response) => {
  const { jobId } = req.params;
  const job = jobManager.getJob(jobId);

  if (!job || !job.outputFile || !fs.existsSync(job.outputFile)) {
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
app.delete('/api/job/:jobId', (req: Request, res: Response) => {
  const { jobId } = req.params;
  const success = jobManager.cancelJob(jobId);
  return res.json({ success });
});

// Serve frontend static build if available across various cloud hosting layouts
const candidateDistPaths = [
  path.resolve(__dirname, '../../frontend/dist'),
  path.resolve(process.cwd(), 'dist'),
  path.resolve(process.cwd(), 'clipslice/frontend/dist'),
  path.resolve(__dirname, '../../../dist'),
  path.resolve(process.cwd(), 'cut'),
];

const frontendDistPath = candidateDistPaths.find(p => fs.existsSync(p) && fs.existsSync(path.join(p, 'index.html')));

if (frontendDistPath) {
  console.log(`[Static] Serving frontend from: ${frontendDistPath}`);
  app.use(express.static(frontendDistPath));
  
  app.get('*', (req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    const indexHtml = path.join(frontendDistPath, 'index.html');
    if (fs.existsSync(indexHtml)) {
      return res.sendFile(indexHtml);
    }
    next();
  });
}

// 404 handler for unmatched API routes
app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, error: 'Endpoint not found.' });
});

// Global error handler
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[Unhandled Server Error]:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error occurred.',
  });
});

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`===============================================`);
  console.log(`  ClipSlice Full-Stack Server`);
  console.log(`  Running on: http://localhost:${PORT}`);
  console.log(`  yt-dlp:  ${YTDLP_PATH}`);
  console.log(`  ffmpeg:  ${FFMPEG_PATH}`);
  console.log(`  temp dir:${TEMP_DIR}`);
  console.log(`===============================================`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nGracefully shutting down ClipSlice server...');
  jobManager.destroy();
  server.close(() => {
    process.exit(0);
  });
});
