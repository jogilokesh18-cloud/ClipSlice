/**
 * Converts total seconds to "MM:SS" or "HH:MM:SS"
 */
export function secondsToTime(totalSeconds: number, forceHours = false): string {
  if (isNaN(totalSeconds) || totalSeconds < 0) return '00:00';
  const sec = Math.floor(totalSeconds);
  const hours = Math.floor(sec / 3600);
  const minutes = Math.floor((sec % 3600) / 60);
  const remainingSeconds = sec % 60;

  const mm = minutes.toString().padStart(2, '0');
  const ss = remainingSeconds.toString().padStart(2, '0');

  if (hours > 0 || forceHours) {
    const hh = hours.toString().padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  }
  return `${mm}:${ss}`;
}

/**
 * Parses user input like "3:05", "03:05", "1:02:03", or raw seconds "185" into seconds.
 * Returns null if invalid.
 */
export function timeToSeconds(input: string): number | null {
  const str = input.trim();
  if (!str) return null;

  // Single number like "185" or "45.5"
  if (/^\d+(\.\d+)?$/.test(str)) {
    const val = parseFloat(str);
    return isNaN(val) || val < 0 ? null : Math.round(val * 100) / 100;
  }

  const parts = str.split(':');
  if (parts.length === 2) {
    const minutes = parseInt(parts[0], 10);
    const seconds = parseFloat(parts[1]);
    if (isNaN(minutes) || isNaN(seconds) || minutes < 0 || seconds < 0 || seconds >= 60) {
      return null;
    }
    return minutes * 60 + seconds;
  } else if (parts.length === 3) {
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
      return null;
    }
    return hours * 3600 + minutes * 60 + seconds;
  }

  return null;
}

/**
 * Returns formatted human file size e.g. "12.4 MB"
 */
export function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(1)} ${units[unitIndex]}`;
}
