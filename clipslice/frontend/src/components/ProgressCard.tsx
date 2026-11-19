import React from 'react';
import { Loader2, CheckCircle2, AlertCircle, XCircle, Gauge, Timer } from 'lucide-react';
import { JobProgress } from '../types';

interface ProgressCardProps {
  progress: JobProgress;
  onCancel?: () => void;
}

export const ProgressCard: React.FC<ProgressCardProps> = ({ progress, onCancel }) => {
  const isError = progress.status === 'error';
  const isCompleted = progress.status === 'completed';

  const steps = [
    { label: 'Stream Manifest', activeAt: 5 },
    { label: 'Download Section', activeAt: 20 },
    { label: 'FFmpeg Remux', activeAt: 85 },
    { label: 'Ready', activeAt: 100 },
  ];

  return (
    <div className="w-full bg-zinc-900/90 border border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-xl backdrop-blur-md space-y-4">
      {/* Header & Status Indicator */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {isError ? (
            <div className="w-8 h-8 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center">
              <AlertCircle className="w-5 h-5" />
            </div>
          ) : isCompleted ? (
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center animate-spin">
              <Loader2 className="w-5 h-5" />
            </div>
          )}

          <div>
            <h3 className="text-sm sm:text-base font-bold text-zinc-100 flex items-center gap-2">
              {isError
                ? 'Processing Error'
                : isCompleted
                ? 'Clip Ready!'
                : 'Slicing Target Clip...'}
            </h3>
            <p className="text-xs text-zinc-400 truncate max-w-xs sm:max-w-md">
              {progress.stage || 'Working...'}
            </p>
          </div>
        </div>

        {/* Percentage Badge */}
        {!isError && (
          <div className="text-right">
            <span className="font-mono text-xl sm:text-2xl font-extrabold text-cyan-400">
              {progress.progress}%
            </span>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      {!isError && (
        <div className="w-full bg-zinc-950 rounded-full h-3 p-0.5 border border-zinc-800 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              isCompleted
                ? 'bg-emerald-500'
                : 'bg-gradient-to-r from-cyan-500 via-indigo-500 to-emerald-400 shadow-[0_0_12px_rgba(6,182,212,0.5)]'
            }`}
            style={{ width: `${Math.max(4, Math.min(100, progress.progress))}%` }}
          />
        </div>
      )}

      {/* Speed & ETA stats */}
      {!isCompleted && !isError && (progress.speed || progress.eta) && (
        <div className="flex items-center gap-4 text-xs font-mono text-zinc-400 bg-zinc-950/60 py-2 px-3 rounded-lg border border-zinc-800/60">
          {progress.speed && (
            <div className="flex items-center gap-1.5">
              <Gauge className="w-3.5 h-3.5 text-cyan-400" />
              <span>Speed: <strong className="text-zinc-200">{progress.speed}</strong></span>
            </div>
          )}
          {progress.eta && (
            <div className="flex items-center gap-1.5">
              <Timer className="w-3.5 h-3.5 text-emerald-400" />
              <span>ETA: <strong className="text-zinc-200">{progress.eta}</strong></span>
            </div>
          )}
        </div>
      )}

      {/* Step Indicators */}
      {!isError && (
        <div className="grid grid-cols-4 gap-2 pt-1">
          {steps.map((st, i) => {
            const isDone = progress.progress >= st.activeAt;
            const isCurrent = progress.progress < st.activeAt && (i === 0 || progress.progress >= steps[i - 1].activeAt);
            return (
              <div key={st.label} className="text-center">
                <div
                  className={`h-1 rounded-full mb-1.5 transition-colors ${
                    isDone ? 'bg-cyan-500' : isCurrent ? 'bg-cyan-500/40 animate-pulse' : 'bg-zinc-800'
                  }`}
                />
                <span
                  className={`text-[10px] sm:text-xs block truncate ${
                    isDone ? 'text-cyan-300 font-semibold' : 'text-zinc-500'
                  }`}
                >
                  {st.label}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Error Details */}
      {isError && (
        <div className="p-3 bg-red-950/30 border border-red-800/40 rounded-xl text-xs text-red-300">
          {progress.error || 'An unexpected error occurred while processing the video.'}
        </div>
      )}

      {/* Cancel Action */}
      {!isCompleted && onCancel && (
        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="text-xs text-zinc-500 hover:text-red-400 flex items-center gap-1 transition-colors"
          >
            <XCircle className="w-3.5 h-3.5" /> Cancel Job
          </button>
        </div>
      )}
    </div>
  );
};
