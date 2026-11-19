import React from 'react';
import { VideoMetadata } from '../types';
import { secondsToTime } from '../utils/timeFormat';
import { User, Globe, ExternalLink } from 'lucide-react';

interface VideoInfoCardProps {
  metadata: VideoMetadata;
}

export const VideoInfoCard: React.FC<VideoInfoCardProps> = ({ metadata }) => {
  const getPlatformBadgeColor = (platform: string) => {
    switch (platform) {
      case 'youtube':
        return 'bg-red-500/20 text-red-400 border-red-500/40';
      case 'vimeo':
        return 'bg-sky-500/20 text-sky-400 border-sky-500/40';
      case 'twitch':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/40';
      case 'x':
        return 'bg-blue-400/20 text-blue-300 border-blue-400/40';
      default:
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
    }
  };

  return (
    <div className="flex flex-col sm:flex-row gap-4 bg-zinc-900/80 border border-zinc-800/90 rounded-2xl p-4 sm:p-5 shadow-lg backdrop-blur-md">
      {/* Thumbnail Container */}
      <div className="relative shrink-0 sm:w-48 aspect-video rounded-xl overflow-hidden bg-zinc-950 border border-zinc-800">
        {metadata.thumbnail ? (
          <img
            src={metadata.thumbnail}
            alt={metadata.title}
            className="w-full h-full object-cover"
            onError={(e) => {
              // Hide broken image placeholder
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-zinc-600">
            <Globe className="w-8 h-8" />
          </div>
        )}

        {/* Duration Badge */}
        <div className="absolute bottom-2 right-2 bg-black/80 backdrop-blur-md text-white font-mono text-xs px-2 py-0.5 rounded-md border border-white/10 font-medium">
          {secondsToTime(metadata.duration, metadata.duration >= 3600)}
        </div>
      </div>

      {/* Info Details */}
      <div className="flex flex-col justify-between flex-1 min-w-0">
        <div>
          {/* Platform Badge & Link */}
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span
              className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${getPlatformBadgeColor(
                metadata.platform
              )}`}
            >
              {metadata.displayPlatform}
            </span>

            <a
              href={metadata.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-zinc-500 hover:text-zinc-300 flex items-center gap-1 transition-colors"
            >
              Source <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* Title */}
          <h2 className="text-base sm:text-lg font-bold text-zinc-100 line-clamp-2 leading-snug">
            {metadata.title}
          </h2>
        </div>

        {/* Uploader / Channel */}
        <div className="flex items-center gap-2 text-xs text-zinc-400 mt-2 sm:mt-0 pt-2 border-t border-zinc-800/60">
          <User className="w-3.5 h-3.5 text-zinc-500" />
          <span className="truncate">{metadata.uploader}</span>
          <span className="text-zinc-600">•</span>
          <span className="font-mono text-zinc-400">
            Total: {secondsToTime(metadata.duration, metadata.duration >= 3600)}
          </span>
        </div>
      </div>
    </div>
  );
};
