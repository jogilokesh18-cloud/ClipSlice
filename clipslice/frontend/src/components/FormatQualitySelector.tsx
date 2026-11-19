import React from 'react';
import { Video, Headphones, Sparkles, Check, Zap, Target } from 'lucide-react';
import { OutputFormat, ResolutionOption, ClipSpeedMode } from '../types';

interface FormatQualitySelectorProps {
  format: OutputFormat;
  onFormatChange: (format: OutputFormat) => void;
  quality: string;
  onQualityChange: (quality: string) => void;
  availableResolutions: ResolutionOption[];
  mode: ClipSpeedMode;
  onModeChange: (mode: ClipSpeedMode) => void;
  disabled?: boolean;
}

export const FormatQualitySelector: React.FC<FormatQualitySelectorProps> = ({
  format,
  onFormatChange,
  quality,
  onQualityChange,
  availableResolutions,
  mode,
  onModeChange,
  disabled = false,
}) => {
  // Extract resolution labels
  const resolutions = availableResolutions.length > 0
    ? availableResolutions
    : [
        { label: 'Best', height: 1080 },
        { label: '1080p', height: 1080 },
        { label: '720p', height: 720 },
        { label: '480p', height: 480 },
      ];

  return (
    <div className="w-full space-y-4 bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-4">
      {/* 1. Format Selection Toggle */}
      <div>
        <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400 block mb-2">
          1. Choose Format
        </label>
        <div className="grid grid-cols-2 gap-3">
          {/* MP4 Option */}
          <button
            type="button"
            disabled={disabled}
            onClick={() => onFormatChange('mp4')}
            className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
              format === 'mp4'
                ? 'bg-cyan-500/10 border-cyan-500/60 text-white ring-1 ring-cyan-500/40 shadow-sm'
                : 'bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  format === 'mp4' ? 'bg-cyan-500 text-zinc-950 font-bold' : 'bg-zinc-800 text-zinc-400'
                }`}
              >
                <Video className="w-4 h-4" />
              </div>
              <div>
                <div className="text-sm font-semibold text-zinc-100 flex items-center gap-1.5">
                  MP4 Video
                </div>
                <div className="text-[11px] text-zinc-400">Video + synced audio</div>
              </div>
            </div>
            {format === 'mp4' && <Check className="w-4 h-4 text-cyan-400" />}
          </button>

          {/* MP3 Option */}
          <button
            type="button"
            disabled={disabled}
            onClick={() => onFormatChange('mp3')}
            className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
              format === 'mp3'
                ? 'bg-emerald-500/10 border-emerald-500/60 text-white ring-1 ring-emerald-500/40 shadow-sm'
                : 'bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  format === 'mp3' ? 'bg-emerald-500 text-zinc-950 font-bold' : 'bg-zinc-800 text-zinc-400'
                }`}
              >
                <Headphones className="w-4 h-4" />
              </div>
              <div>
                <div className="text-sm font-semibold text-zinc-100">
                  MP3 Audio
                </div>
                <div className="text-[11px] text-zinc-400">Audio only (320kbps)</div>
              </div>
            </div>
            {format === 'mp3' && <Check className="w-4 h-4 text-emerald-400" />}
          </button>
        </div>
      </div>

      {/* 2. Video Quality (Only when MP4 is selected) */}
      {format === 'mp4' && (
        <div className="pt-2 border-t border-zinc-800/80">
          <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400 block mb-2 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            2. Video Resolution Quality
          </label>
          <div className="flex flex-wrap gap-2">
            {resolutions.map((res) => {
              const isSelected = quality.toLowerCase() === res.label.toLowerCase();
              return (
                <button
                  key={res.label}
                  type="button"
                  disabled={disabled}
                  onClick={() => onQualityChange(res.label)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-medium transition-all flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-cyan-500 text-zinc-950 font-bold shadow-md shadow-cyan-500/20'
                      : 'bg-zinc-800/80 text-zinc-300 hover:bg-zinc-700 border border-zinc-700/60'
                  }`}
                >
                  {res.label === 'Best' && <Sparkles className="w-3 h-3" />}
                  {res.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. Trimming Speed Mode */}
      <div className="pt-2 border-t border-zinc-800/80">
        <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400 block mb-2 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            3. Trimming Speed Mode
          </span>
          <span className="text-[11px] font-normal text-zinc-500 lowercase">
            lightning mode cuts in 1-2s
          </span>
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {/* Lightning Fast */}
          <button
            type="button"
            disabled={disabled}
            onClick={() => onModeChange('fast')}
            className={`flex items-start gap-2.5 p-3 rounded-xl border text-left transition-all ${
              mode === 'fast'
                ? 'bg-amber-500/10 border-amber-500/60 text-white ring-1 ring-amber-500/30'
                : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:border-zinc-700'
            }`}
          >
            <Zap className={`w-4 h-4 mt-0.5 shrink-0 ${mode === 'fast' ? 'text-amber-400' : 'text-zinc-500'}`} />
            <div>
              <div className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                <span>⚡ Lightning Fast</span>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded font-mono">1-2s</span>
              </div>
              <div className="text-[11px] text-zinc-400 leading-tight mt-0.5">
                Lossless stream copy (no re-encoding, maximum speed)
              </div>
            </div>
          </button>

          {/* Frame Accurate */}
          <button
            type="button"
            disabled={disabled}
            onClick={() => onModeChange('accurate')}
            className={`flex items-start gap-2.5 p-3 rounded-xl border text-left transition-all ${
              mode === 'accurate'
                ? 'bg-cyan-500/10 border-cyan-500/60 text-white ring-1 ring-cyan-500/30'
                : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:border-zinc-700'
            }`}
          >
            <Target className={`w-4 h-4 mt-0.5 shrink-0 ${mode === 'accurate' ? 'text-cyan-400' : 'text-zinc-500'}`} />
            <div>
              <div className="text-xs font-semibold text-zinc-200">
                🎯 Frame Accurate
              </div>
              <div className="text-[11px] text-zinc-400 leading-tight mt-0.5">
                Re-encodes keyframes for exact millisecond cuts
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
