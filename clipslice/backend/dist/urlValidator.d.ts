export type VideoPlatform = 'youtube' | 'vimeo' | 'x' | 'twitch' | 'direct';
export interface ValidatedUrl {
    platform: VideoPlatform;
    normalized: string;
    domain: string;
    displayPlatform: string;
}
export declare function validateVideoUrl(raw: string): ValidatedUrl;
