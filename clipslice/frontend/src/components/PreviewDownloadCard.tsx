import React from 'react';
import { Download, Film, Music, Clock, RotateCcw, Check, Sparkles } from 'lucide-react';
import { JobProgress } from '../types';
import { formatBytes } from '../utils/timeFormat';
import { API_BASE } from '../utils/apiConfig';

interface PreviewDownloadCardProps {
  progress: JobProgress;
  onReset: () => void;
}

export const PreviewDownloadCard: React.FC<PreviewDownloadCardProps> = ({ progress, onReset }) => {
  const streamUrl = `${API_BASE}/api/stream/${progress.id}`;
  const downloadUrl = `${API_BASE}/api/download/${progress.id}`;
  const isAudio = progress.mimeType?.includes('audio') || progress.filename?.endsWith('.mp3');

  return (
    <div className="w-full bg-zinc-900/90 border border-emerald-500/40 rounded-2xl p-5 sm:p-7 shadow-2xl backdrop-blur-xl space-y-6">
      {/* Success Banner */}
      <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
            <Check className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <h3 className="text-base font-bold text-zinc-100 flex items-center gap-1.5">
              <span>Clip Sliced Successfully!</span>
              <Sparkles className="w-4 h-4 text-emerald-400" />
            </h3>
            <p className="text-xs text-zinc-400">
              Only the requested segment was downloaded and processed.
            </p>
          </div>
        </div>

        {/* Temporary file notice */}
        <div className="hidden sm:flex items-center gap-1 text-[11px] text-zinc-400 bg-zinc-950/80 px-2.5 py-1 rounded-md border border-zinc-800">
          <Clock className="w-3 h-3 text-amber-400" />
          <span>Auto-expires in 15m</span>
        </div>
      </div>

      {/* In-Browser Preview Player */}
      <div className="w-full rounded-xl overflow-hidden bg-zinc-950 border border-zinc-800/80 shadow-inner flex flex-col items-center justify-center">
        {isAudio ? (
          <div className="w-full py-8 px-6 flex flex-col items-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-lg">
              <Music className="w-8 h-8" />
            </div>
            <div className="text-center">
              <h4 className="text-sm font-semibold text-zinc-200">Audio Preview</h4>
              <p className="text-xs text-zinc-500">{progress.filename}</p>
            </div>
            <audio
              controls
              className="w-full max-w-md accent-emerald-500"
              src={streamUrl}
              preload="metadata"
            >
              Your browser does not support the audio element.
            </audio>
          </div>
        ) : (
          <div className="w-full aspect-video bg-black flex items-center justify-center">
            <video
              controls
              playsInline
              className="w-full h-full object-contain"
              src={streamUrl}
              preload="metadata"
            >
              Your browser does not support the video tag.
            </video>
          </div>
        )}
      </div>

      {/* File Details & Download Row */}
      <div className="space-y-4">
        {/* Filename & size chip */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-zinc-950/70 border border-zinc-800/80 rounded-xl text-xs font-mono">
          <div className="flex items-center gap-2 truncate">
            {isAudio ? (
              <Music className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <Film className="w-4 h-4 text-cyan-400 shrink-0" />
            )}
            <span className="truncate text-zinc-200" title={progress.filename}>
              {progress.filename}
            </span>
          </div>
          {progress.fileSize && (
            <span className="text-zinc-400 font-semibold shrink-0">
              {formatBytes(progress.fileSize)}
            </span>
          )}
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <a
            href={downloadUrl}
            download={progress.filename}
            className="flex-1 flex items-center justify-center gap-2.5 py-3.5 px-6 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-zinc-950 font-bold text-sm sm:text-base rounded-xl shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.01] active:scale-[0.99]"
          >
            <Download className="w-5 h-5 stroke-[2.5]" />
            <span>Download Trimmed Clip</span>
          </a>

          <button
            type="button"
            onClick={onReset}
            className="flex items-center justify-center gap-2 py-3.5 px-5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white font-medium text-sm rounded-xl border border-zinc-700/80 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Cut Another</span>
          </button>
        </div>
      </div>
    </div>
  );
};
