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
export class RateLimiter {
  private readonly hits = new Map<string, number[]>();

  constructor(private readonly options: RateLimiterOptions) {}

  check(key: string): RateLimitResult {
    const now = Date.now();
    const windowStart = now - this.options.windowMs;
    const timestamps = (this.hits.get(key) ?? []).filter((t) => t > windowStart);

    if (timestamps.length >= this.options.maxRequests) {
      const oldest = timestamps[0];
      return {
        allowed: false,
        retryAfterMs: Math.max(0, oldest + this.options.windowMs - now),
      };
    }

    timestamps.push(now);
    this.hits.set(key, timestamps);
    return { allowed: true };
  }
}