/**
 * Parses time representation (seconds number or string like "03:05", "1:02:03", "185") into total seconds.
 */
export function parseTimeToSeconds(input: string | number): number {
  if (typeof input === 'number') {
    if (isNaN(input) || input < 0) {
      throw new Error('Invalid time value');
    }
    return Math.max(0, Math.round(input * 100) / 100);
  }

  const str = input.trim();
  if (!str) {
    throw new Error('Time value cannot be empty');
  }

  // Pure numeric string e.g. "125" or "125.5"
  if (/^\d+(\.\d+)?$/.test(str)) {
    const val = parseFloat(str);
    if (isNaN(val) || val < 0) throw new Error('Invalid time value');
    return Math.max(0, Math.round(val * 100) / 100);
  }

  // Split by ":"
  const parts = str.split(':');
  if (parts.length === 2) {
    // MM:SS
    const minutes = parseInt(parts[0], 10);
    const seconds = parseFloat(parts[1]);
    if (isNaN(minutes) || isNaN(seconds) || minutes < 0 || seconds < 0 || seconds >= 60) {
      throw new Error(`Invalid MM:SS time format: "${str}"`);
    }
    return minutes * 60 + seconds;
  } else if (parts.length === 3) {
    // HH:MM:SS
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    const seconds = parseFloat(parts[2]);
    if (
      isNaN(hours) ||
      isNaN(minutes) ||
      isNaN(seconds) ||
      hours < 0 ||
      minutes < 0 ||
      minutes >= 60 ||
      seconds < 0 ||
      seconds >= 60
    ) {
      throw new Error(`Invalid HH:MM:SS time format: "${str}"`);
    }
    return hours * 3600 + minutes * 60 + seconds;
  }

  throw new Error(`Unrecognized time format: "${str}". Use MM:SS or HH:MM:SS.`);
}

/**
 * Formats total seconds into a human-friendly string (MM:SS or HH:MM:SS).
 */
export function formatSecondsToTime(totalSeconds: number): string {
  if (isNaN(totalSeconds) || totalSeconds < 0) return '00:00';
  const sec = Math.floor(totalSeconds);
  const hours = Math.floor(sec / 3600);
  const minutes = Math.floor((sec % 3600) / 60);
  const remainingSeconds = sec % 60;

  const mm = minutes.toString().padStart(2, '0');
  const ss = remainingSeconds.toString().padStart(2, '0');

  if (hours > 0) {
    const hh = hours.toString().padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  }
  return `${mm}:${ss}`;
}

/**
 * Format timestamp for filename e.g. "03m05s" or "01h02m03s"
 */
export function formatSecondsForFilename(totalSeconds: number): string {
  const sec = Math.floor(totalSeconds);
  const hours = Math.floor(sec / 3600);
  const minutes = Math.floor((sec % 3600) / 60);
  const remainingSeconds = sec % 60;

  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}h${minutes.toString().padStart(2, '0')}m${remainingSeconds.toString().padStart(2, '0')}s`;
  }
  return `${minutes.toString().padStart(2, '0')}m${remainingSeconds.toString().padStart(2, '0')}s`;
}

/**
 * Sanitizes title for use in download filenames.
 */
export function sanitizeFilename(title: string, startSec: number, endSec: number, ext: string): string {
  const cleanTitle = title
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '') // remove illegal filesystem chars
    .replace(/\s+/g, '_')
    .slice(0, 40)
    .replace(/^_+|_+$/g, '') || 'video';

  const range = `${formatSecondsForFilename(startSec)}-${formatSecondsForFilename(endSec)}`;
  return `ClipSlice_${cleanTitle}_${range}.${ext}`;
}

/**
 * Validates start and end time boundaries against video total duration.
 */
export function validateTimeRange(
  startSec: number,
  endSec: number,
  totalDuration?: number
): { valid: boolean; error?: string } {
  if (isNaN(startSec) || startSec < 0) {
    return { valid: false, error: 'Start time must be greater than or equal to 00:00' };
  }

  if (isNaN(endSec) || endSec <= 0) {
    return { valid: false, error: 'End time must be greater than 00:00' };
  }

  if (endSec <= startSec) {
    return { valid: false, error: 'End time must be greater than Start time' };
  }

  const clipDuration = endSec - startSec;
  if (clipDuration < 0.5) {
    return { valid: false, error: 'Clip duration must be at least 0.5 seconds' };
  }

  if (totalDuration !== undefined && totalDuration > 0) {
    // allow a 2-second margin for rounding/stream duration discrepancies
    if (startSec > totalDuration + 2) {
      return { valid: false, error: `Start time (${formatSecondsToTime(startSec)}) exceeds video duration (${formatSecondsToTime(totalDuration)})` };
    }
    if (endSec > totalDuration + 2) {
      return { valid: false, error: `End time (${formatSecondsToTime(endSec)}) exceeds video duration (${formatSecondsToTime(totalDuration)})` };
    }
  }

  return { valid: true };
}
