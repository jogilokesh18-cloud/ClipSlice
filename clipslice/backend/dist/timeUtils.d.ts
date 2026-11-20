/**
 * Parses time representation (seconds number or string like "03:05", "1:02:03", "185") into total seconds.
 */
export declare function parseTimeToSeconds(input: string | number): number;
/**
 * Formats total seconds into a human-friendly string (MM:SS or HH:MM:SS).
 */
export declare function formatSecondsToTime(totalSeconds: number): string;
/**
 * Format timestamp for filename e.g. "03m05s" or "01h02m03s"
 */
export declare function formatSecondsForFilename(totalSeconds: number): string;
/**
 * Sanitizes title for use in download filenames.
 */
export declare function sanitizeFilename(title: string, startSec: number, endSec: number, ext: string): string;
/**
 * Validates start and end time boundaries against video total duration.
 */
export declare function validateTimeRange(startSec: number, endSec: number, totalDuration?: number): {
    valid: boolean;
    error?: string;
};
