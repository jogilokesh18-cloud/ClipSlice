export type VideoPlatform = 'youtube' | 'vimeo' | 'x' | 'twitch' | 'direct';

export interface ResolutionOption {
  label: string;
  height: number;
  formatId?: string;
  hasAudio?: boolean;
}

export interface VideoMetadata {
  title: string;
  thumbnail: string;
  duration: number; // seconds
  uploader: string;
  platform: VideoPlatform;
  displayPlatform: string;
  url: string;
  resolutions: ResolutionOption[];
}

export type JobStatus = 'queued' | 'fetching' | 'downloading' | 'processing' | 'completed' | 'error';

export interface JobProgress {
  id: string;
  status: JobStatus;
  progress: number;
  stage: string;
  speed?: string;
  eta?: string;
  filename?: string;
  fileSize?: number;
  mimeType?: string;
  error?: string;
}

export type OutputFormat = 'mp4' | 'mp3';
export type ClipSpeedMode = 'fast' | 'accurate';

