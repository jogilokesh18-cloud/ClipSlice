import { Response } from 'express';
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
    progress: number;
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
declare class JobManager {
    private jobs;
    private subscribers;
    private cleanupInterval;
    constructor();
    createJob(params: {
        id: string;
        url: string;
        title: string;
        startTime: number;
        endTime: number;
        format: 'mp4' | 'mp3';
        quality: string;
    }): Job;
    getJob(id: string): Job | undefined;
    updateJob(id: string, updates: Partial<Omit<Job, 'id' | 'createdAt'>>): Job | undefined;
    setChildProcess(id: string, cp: ChildProcess): void;
    subscribe(id: string, res: Response): void;
    private notifySubscribers;
    private sendSseEvent;
    cancelJob(id: string): boolean;
    private startCleanupTask;
    purgeExpiredFiles(): void;
    destroy(): void;
}
export declare const jobManager: JobManager;
export {};
