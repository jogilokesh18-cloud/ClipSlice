"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.jobManager = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const config_1 = require("./config");
class JobManager {
    constructor() {
        this.jobs = new Map();
        this.subscribers = new Map();
        this.cleanupInterval = null;
        this.startCleanupTask();
    }
    createJob(params) {
        const job = {
            ...params,
            status: 'queued',
            progress: 0,
            stage: 'Preparing clip request...',
            createdAt: Date.now(),
        };
        this.jobs.set(job.id, job);
        return job;
    }
    getJob(id) {
        return this.jobs.get(id);
    }
    updateJob(id, updates) {
        const job = this.jobs.get(id);
        if (!job)
            return undefined;
        Object.assign(job, updates);
        // Broadcast to SSE subscribers
        this.notifySubscribers(job);
        return job;
    }
    setChildProcess(id, cp) {
        const job = this.jobs.get(id);
        if (job) {
            job.childProcess = cp;
        }
    }
    subscribe(id, res) {
        if (!this.subscribers.has(id)) {
            this.subscribers.set(id, new Set());
        }
        const set = this.subscribers.get(id);
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
    notifySubscribers(job) {
        const set = this.subscribers.get(job.id);
        if (!set || set.size === 0)
            return;
        for (const res of set) {
            this.sendSseEvent(res, job);
        }
    }
    sendSseEvent(res, job) {
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
        }
        catch {
            // socket might be closed
        }
    }
    cancelJob(id) {
        const job = this.jobs.get(id);
        if (!job)
            return false;
        if (job.childProcess) {
            try {
                job.childProcess.kill('SIGTERM');
            }
            catch {
                // ignore
            }
        }
        // Clean up partial file if exists
        if (job.outputFile && fs_1.default.existsSync(job.outputFile)) {
            try {
                fs_1.default.unlinkSync(job.outputFile);
            }
            catch {
                // ignore
            }
        }
        job.status = 'error';
        job.stage = 'Cancelled by user';
        job.error = 'Job was cancelled';
        this.notifySubscribers(job);
        return true;
    }
    startCleanupTask() {
        // Run cleanup every 60 seconds
        this.cleanupInterval = setInterval(() => {
            this.purgeExpiredFiles();
        }, 60 * 1000);
        this.cleanupInterval.unref();
    }
    purgeExpiredFiles() {
        const now = Date.now();
        try {
            if (!fs_1.default.existsSync(config_1.TEMP_DIR))
                return;
            const files = fs_1.default.readdirSync(config_1.TEMP_DIR);
            for (const file of files) {
                const filePath = path_1.default.join(config_1.TEMP_DIR, file);
                try {
                    const stats = fs_1.default.statSync(filePath);
                    const age = now - stats.mtimeMs;
                    if (age > config_1.FILE_TTL_MS) {
                        fs_1.default.unlinkSync(filePath);
                        console.log(`[AutoCleanup] Removed expired temp file: ${file} (age: ${Math.round(age / 60000)}m)`);
                    }
                }
                catch {
                    // ignore busy/deleted files
                }
            }
            // Also clean up old jobs in memory
            for (const [id, job] of this.jobs.entries()) {
                const jobAge = now - job.createdAt;
                if (jobAge > config_1.FILE_TTL_MS && (job.status === 'completed' || job.status === 'error')) {
                    this.jobs.delete(id);
                }
            }
        }
        catch (err) {
            console.error('[AutoCleanup] Error running file cleanup:', err);
        }
    }
    destroy() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
    }
}
exports.jobManager = new JobManager();
//# sourceMappingURL=jobManager.js.map