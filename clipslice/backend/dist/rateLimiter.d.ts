export interface RateLimiterOptions {
    windowMs: number;
    maxRequests: number;
}
export interface RateLimitResult {
    allowed: boolean;
    retryAfterMs?: number;
}
/**
 * In-memory sliding-window rate limiter keyed by caller id (e.g. IP).
 * Not a replacement for a production-grade limiter, but sufficient to
 * prevent a single client from hammering yt-dlp / FFmpeg.
 */
export declare class RateLimiter {
    private readonly options;
    private readonly hits;
    constructor(options: RateLimiterOptions);
    check(key: string): RateLimitResult;
}
