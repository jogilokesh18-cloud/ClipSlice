export type VideoPlatform = 'youtube' | 'vimeo' | 'x' | 'twitch' | 'direct';

export interface ValidatedUrl {
  platform: VideoPlatform;
  normalized: string;
  domain: string;
  displayPlatform: string;
}

const FORBIDDEN_HOSTNAMES = new Set([
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '[::1]',
  '::1',
  'local',
]);

function isPrivateIp(hostname: string): boolean {
  // IPv4 checks
  const ipv4Match = hostname.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (ipv4Match) {
    const [, a, b] = ipv4Match.map(Number);
    if (a === 10) return true; // 10.0.0.0/8
    if (a === 127) return true; // 127.0.0.0/8 loopback
    if (a === 0) return true; // 0.0.0.0/8
    if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
    if (a === 192 && b === 168) return true; // 192.168.0.0/16
    if (a === 169 && b === 254) return true; // 169.254.0.0/16 link-local
    return false;
  }

  // Pure integer or hex ip check e.g. 2130706433 or 0x7f000001
  if (/^0x[0-9a-f]+$/i.test(hostname) || /^\d+$/.test(hostname)) {
    return true;
  }

  // IPv6 loopback / private
  if (hostname.startsWith('[fc') || hostname.startsWith('[fd') || hostname.startsWith('[fe80')) {
    return true;
  }

  return false;
}

const YOUTUBE_REGEX = /^(?:https?:\/\/)?(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?.*v=|shorts\/|embed\/|v\/|clip\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i;
const VIMEO_REGEX = /^(?:https?:\/\/)?(?:www\.|player\.)?vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/(?:[^\/]*)\/videos\/|album\/(?:\d+)\/video\/|video\/|)(\d+)/i;
const X_REGEX = /^(?:https?:\/\/)?(?:www\.|mobile\.)?(?:twitter\.com|x\.com)\/(?:[a-zA-Z0-9_]+)\/status\/(\d+)/i;
const TWITCH_REGEX = /^(?:https?:\/\/)?(?:www\.)?twitch\.tv\/(?:videos\/(\d+)|([a-zA-Z0-9_]+)\/clip\/([a-zA-Z0-9_-]+)|clips\.twitch\.tv\/([a-zA-Z0-9_-]+))/i;
const DIRECT_VIDEO_EXT = /\.(mp4|webm|m3u8|mov|mkv|m4v|flv|ts)(\?.*)?$/i;

export function validateVideoUrl(raw: string): ValidatedUrl {
  if (typeof raw !== 'string') {
    throw new Error('URL must be a string');
  }

  let trimmed = raw.trim();
  if (!trimmed) {
    throw new Error('Video URL is required');
  }

  if (trimmed.length > 2048) {
    throw new Error('URL exceeds maximum permitted length (2048 characters)');
  }

  // Prepend https:// if protocol is omitted
  if (!/^https?:\/\//i.test(trimmed)) {
    trimmed = 'https://' + trimmed;
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error('Invalid URL format. Please enter a valid video link.');
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Only HTTP and HTTPS protocols are supported.');
  }

  const host = parsed.hostname.toLowerCase();

  // SSRF Protection
  if (FORBIDDEN_HOSTNAMES.has(host) || isPrivateIp(host) || host.endsWith('.local') || host.endsWith('.internal')) {
    throw new Error('Access to local, loopback, or private network addresses is prohibited.');
  }

  const cleanHost = host.replace(/^www\./, '').replace(/^m\./, '');

  // YouTube
  if (cleanHost === 'youtube.com' || cleanHost === 'youtu.be') {
    if (!YOUTUBE_REGEX.test(trimmed) && !trimmed.includes('youtube.com/watch') && !trimmed.includes('youtu.be/')) {
      throw new Error('Invalid YouTube video link. Example: https://www.youtube.com/watch?v=...');
    }
    return {
      platform: 'youtube',
      normalized: trimmed,
      domain: cleanHost,
      displayPlatform: 'YouTube',
    };
  }

  // Vimeo
  if (cleanHost === 'vimeo.com' || cleanHost === 'player.vimeo.com') {
    return {
      platform: 'vimeo',
      normalized: trimmed,
      domain: cleanHost,
      displayPlatform: 'Vimeo',
    };
  }

  // X / Twitter
  if (cleanHost === 'twitter.com' || cleanHost === 'x.com') {
    if (!X_REGEX.test(trimmed)) {
      throw new Error('Invalid X (Twitter) post link. Please provide a link to a status with video.');
    }
    return {
      platform: 'x',
      normalized: trimmed,
      domain: cleanHost,
      displayPlatform: 'X (Twitter)',
    };
  }

  // Twitch
  if (cleanHost === 'twitch.tv' || cleanHost === 'clips.twitch.tv') {
    return {
      platform: 'twitch',
      normalized: trimmed,
      domain: cleanHost,
      displayPlatform: 'Twitch',
    };
  }

  // Direct video link
  if (DIRECT_VIDEO_EXT.test(parsed.pathname)) {
    return {
      platform: 'direct',
      normalized: trimmed,
      domain: cleanHost,
      displayPlatform: 'Direct Video Stream',
    };
  }

  // If the host is known or other web video, verify generic safety
  if (cleanHost.includes('.')) {
    // Treat as general web video compatible with yt-dlp
    return {
      platform: 'direct',
      normalized: trimmed,
      domain: cleanHost,
      displayPlatform: cleanHost,
    };
  }

  throw new Error('Unsupported video source. Supported: YouTube, Vimeo, X, Twitch, and direct video links.');
}
