"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RateLimiter = void 0;
/**
 * In-memory sliding-window rate limiter keyed by caller id (e.g. IP).
 * Not a replacement for a production-grade limiter, but sufficient to
 * prevent a single client from hammering yt-dlp / FFmpeg.
 */
class RateLimiter {
    constructor(options) {
        this.options = options;
        this.hits = new Map();
    }
    check(key) {
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
exports.RateLimiter = RateLimiter;
//# sourceMappingURL=rateLimiter.js.map