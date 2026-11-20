export interface ProcessClipOptions {
    jobId: string;
    url: string;
    title: string;
    startTime: number;
    endTime: number;
    format: 'mp4' | 'mp3';
    quality: string;
    mode?: 'fast' | 'accurate';
    cookies?: string;
}
export declare function startClipDownload(options: ProcessClipOptions): void;
