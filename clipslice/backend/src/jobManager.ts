import fs from 'fs';
import path from 'path';
import { Response } from 'express';
import { TEMP_DIR, FILE_TTL_MS } from './config';
import { ChildProcess } from 'child_process';

export type JobStatus = 'queued' | 'fetching' | 'downloading' | 'processing' | 'completed' | 'error';

export interface Job {
  id: string;
  url: string;
  title: string;
  startTime: number;
  endTime: number;
  format: 'mp4' | 'mp3';
  quality: string;
  status: JobStatus;
  progress: number; // 0 to 100
  stage: string;
  speed?: string;
  eta?: string;
  outputFile?: string;
  filename?: string;
  fileSize?: number;
  mimeType?: string;
  error?: string;
  createdAt: number;
  completedAt?: number;
  childProcess?: ChildProcess;
}

class JobManager {
  private jobs = new Map<string, Job>();
  private subscribers = new Map<string, Set<Response>>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startCleanupTask();
  }

  createJob(params: {
    id: string;
    url: string;
    title: string;
    startTime: number;
    endTime: number;
    format: 'mp4' | 'mp3';
    quality: string;
  }): Job {
    const job: Job = {
      ...params,
      status: 'queued',
      progress: 0,
      stage: 'Preparing clip request...',
      createdAt: Date.now(),
    };
    this.jobs.set(job.id, job);
    return job;
  }

  getJob(id: string): Job | undefined {
    return this.jobs.get(id);
  }

  updateJob(
    id: string,
    updates: Partial<Omit<Job, 'id' | 'createdAt'>>
  ): Job | undefined {
    const job = this.jobs.get(id);
    if (!job) return undefined;

    Object.assign(job, updates);

    // Broadcast to SSE subscribers
    this.notifySubscribers(job);
    return job;
  }

  setChildProcess(id: string, cp: ChildProcess) {
    const job = this.jobs.get(id);
    if (job) {
      job.childProcess = cp;
    }
  }

  subscribe(id: string, res: Response) {
    if (!this.subscribers.has(id)) {
      this.subscribers.set(id, new Set());
    }
    const set = this.subscribers.get(id)!;
    set.add(res);

    // Send initial snapshot
    const job = this.jobs.get(id);
    if (job) {
      this.sendSseEvent(res, job);
    }

    res.on('close', () => {
      set.delete(res);
      if (set.size === 0) {
        this.subscribers.delete(id);
      }
    });
  }

  private notifySubscribers(job: Job) {
    const set = this.subscribers.get(job.id);
    if (!set || set.size === 0) return;

    for (const res of set) {
      this.sendSseEvent(res, job);
    }
  }

  private sendSseEvent(res: Response, job: Job) {
    try {
      const data = {
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
      };
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch {
      // socket might be closed
    }
  }

  cancelJob(id: string): boolean {
    const job = this.jobs.get(id);
    if (!job) return false;

    if (job.childProcess) {
      try {
        job.childProcess.kill('SIGTERM');
      } catch {
        // ignore
      }
    }

    // Clean up partial file if exists
    if (job.outputFile && fs.existsSync(job.outputFile)) {
      try {
        fs.unlinkSync(job.outputFile);
      } catch {
        // ignore
      }
    }

    job.status = 'error';
    job.stage = 'Cancelled by user';
    job.error = 'Job was cancelled';
    this.notifySubscribers(job);
    return true;
  }

  private startCleanupTask() {
    // Run cleanup every 60 seconds
    this.cleanupInterval = setInterval(() => {
      this.purgeExpiredFiles();
    }, 60 * 1000);
    this.cleanupInterval.unref();
  }

  public purgeExpiredFiles() {
    const now = Date.now();
    try {
      if (!fs.existsSync(TEMP_DIR)) return;

      const files = fs.readdirSync(TEMP_DIR);
      for (const file of files) {
        const filePath = path.join(TEMP_DIR, file);
        try {
          const stats = fs.statSync(filePath);
          const age = now - stats.mtimeMs;
          if (age > FILE_TTL_MS) {
            fs.unlinkSync(filePath);
            console.log(`[AutoCleanup] Removed expired temp file: ${file} (age: ${Math.round(age / 60000)}m)`);
          }
        } catch {
          // ignore busy/deleted files
        }
      }

      // Also clean up old jobs in memory
      for (const [id, job] of this.jobs.entries()) {
        const jobAge = now - job.createdAt;
        if (jobAge > FILE_TTL_MS && (job.status === 'completed' || job.status === 'error')) {
          this.jobs.delete(id);
        }
      }
    } catch (err) {
      console.error('[AutoCleanup] Error running file cleanup:', err);
    }
  }

  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}

export const jobManager = new JobManager();
