export interface ResolutionOption {
    label: string;
    height: number;
    formatId?: string;
    hasAudio?: boolean;
}
export interface VideoMetadata {
    title: string;
    thumbnail: string;
    duration: number;
    uploader: string;
    platform: string;
    displayPlatform: string;
    url: string;
    resolutions: ResolutionOption[];
}
export declare function fetchVideoMetadata(rawUrl: string): Promise<VideoMetadata>;
