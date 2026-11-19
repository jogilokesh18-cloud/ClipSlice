import React, { useState, useEffect } from 'react';
import { Clock, AlertCircle, CheckCircle2, RotateCcw, FastForward } from 'lucide-react';
import { secondsToTime, timeToSeconds } from '../utils/timeFormat';

interface TimeControlsProps {
  duration: number;
  startTime: number;
  endTime: number;
  onChange: (start: number, end: number) => void;
  disabled?: boolean;
}

export const TimeControls: React.FC<TimeControlsProps> = ({
  duration,
  startTime,
  endTime,
  onChange,
  disabled = false,
}) => {
  const forceHours = duration >= 3600;

  // Local text input state for smooth typing
  const [startInput, setStartInput] = useState<string>(secondsToTime(startTime, forceHours));
  const [endInput, setEndInput] = useState<string>(secondsToTime(endTime, forceHours));
  const [inputError, setInputError] = useState<string | null>(null);

  // Sync from props when slider or external change occurs
  useEffect(() => {
    setStartInput(secondsToTime(startTime, forceHours));
  }, [startTime, forceHours]);

  useEffect(() => {
    setEndInput(secondsToTime(endTime, forceHours));
  }, [endTime, forceHours]);

  // Validation
  const clipLength = Math.max(0, endTime - startTime);
  const isValid = endTime > startTime && startTime >= 0 && endTime <= duration + 2 && clipLength >= 0.5;

  const handleStartBlur = () => {
    const parsed = timeToSeconds(startInput);
    if (parsed === null) {
      setInputError('Invalid start time format. Use MM:SS or HH:MM:SS');
      setStartInput(secondsToTime(startTime, forceHours));
      return;
    }

    if (parsed < 0) {
      setInputError('Start time cannot be negative');
      setStartInput(secondsToTime(startTime, forceHours));
      return;
    }

    if (parsed >= endTime) {
      setInputError('Start time must be less than End time');
      setStartInput(secondsToTime(startTime, forceHours));
      return;
    }

    setInputError(null);
    onChange(parsed, endTime);
  };

  const handleEndBlur = () => {
    const parsed = timeToSeconds(endInput);
    if (parsed === null) {
      setInputError('Invalid end time format. Use MM:SS or HH:MM:SS');
      setEndInput(secondsToTime(endTime, forceHours));
      return;
    }

    if (parsed <= startTime) {
      setInputError('End time must be greater than Start time');
      setEndInput(secondsToTime(endTime, forceHours));
      return;
    }

    if (parsed > duration + 2) {
      setInputError(`End time exceeds video duration (${secondsToTime(duration, forceHours)})`);
      setEndInput(secondsToTime(endTime, forceHours));
      return;
    }

    setInputError(null);
    onChange(startTime, Math.min(parsed, duration));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, isStart: boolean) => {
    if (e.key === 'Enter') {
      if (isStart) handleStartBlur();
      else handleEndBlur();
    }
  };

  const nudge = (type: 'start' | 'end', delta: number) => {
    if (disabled) return;
    if (type === 'start') {
      const next = Math.max(0, Math.min(startTime + delta, endTime - 1));
      onChange(next, endTime);
    } else {
      const next = Math.min(duration, Math.max(endTime + delta, startTime + 1));
      onChange(startTime, next);
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* Synchronized Inputs Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Start Time Input */}
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-3.5 focus-within:border-cyan-500/70 focus-within:ring-1 focus-within:ring-cyan-500/30 transition-all">
          <div className="flex items-center justify-between text-xs font-semibold text-zinc-400 mb-2">
            <span className="flex items-center gap-1.5 text-cyan-400">
              <Clock className="w-3.5 h-3.5" /> Start Time
            </span>
            <span className="text-zinc-500 text-[11px] font-mono">MM:SS or HH:MM:SS</span>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              disabled={disabled}
              value={startInput}
              onChange={(e) => setStartInput(e.target.value)}
              onBlur={handleStartBlur}
              onKeyDown={(e) => handleKeyDown(e, true)}
              className="w-full bg-zinc-950/80 border border-zinc-700/80 rounded-lg px-3 py-2 text-lg font-mono font-bold text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-cyan-400 focus:bg-zinc-950"
              placeholder="00:00"
            />
            
            {/* Quick Nudge Buttons */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => nudge('start', -5)}
                disabled={disabled || startTime <= 0}
                className="px-2 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs font-mono transition-colors disabled:opacity-40"
                title="Subtract 5 seconds"
              >
                -5s
              </button>
              <button
                type="button"
                onClick={() => nudge('start', 5)}
                disabled={disabled || startTime >= endTime - 1}
                className="px-2 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs font-mono transition-colors disabled:opacity-40"
                title="Add 5 seconds"
              >
                +5s
              </button>
            </div>
          </div>
        </div>

        {/* End Time Input */}
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-3.5 focus-within:border-emerald-500/70 focus-within:ring-1 focus-within:ring-emerald-500/30 transition-all">
          <div className="flex items-center justify-between text-xs font-semibold text-zinc-400 mb-2">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <Clock className="w-3.5 h-3.5" /> End Time
            </span>
            <span className="text-zinc-500 text-[11px] font-mono">MM:SS or HH:MM:SS</span>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              disabled={disabled}
              value={endInput}
              onChange={(e) => setEndInput(e.target.value)}
              onBlur={handleEndBlur}
              onKeyDown={(e) => handleKeyDown(e, false)}
              className="w-full bg-zinc-950/80 border border-zinc-700/80 rounded-lg px-3 py-2 text-lg font-mono font-bold text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-400 focus:bg-zinc-950"
              placeholder="01:00"
            />

            {/* Quick Nudge Buttons */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => nudge('end', -5)}
                disabled={disabled || endTime <= startTime + 1}
                className="px-2 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs font-mono transition-colors disabled:opacity-40"
                title="Subtract 5 seconds"
              >
                -5s
              </button>
              <button
                type="button"
                onClick={() => nudge('end', 5)}
                disabled={disabled || endTime >= duration}
                className="px-2 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs font-mono transition-colors disabled:opacity-40"
                title="Add 5 seconds"
              >
                +5s
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Presets & Live Duration Indicator */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        {/* Quick Presets */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs text-zinc-500 font-medium mr-1 flex items-center gap-1">
            <FastForward className="w-3 h-3" /> Presets:
          </span>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onChange(0, Math.min(30, duration))}
            className="text-xs px-2.5 py-1 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-md border border-zinc-700/60 transition-colors"
          >
            First 30s
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onChange(0, Math.min(60, duration))}
            className="text-xs px-2.5 py-1 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-md border border-zinc-700/60 transition-colors"
          >
            First 1 min
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onChange(0, duration)}
            className="text-xs px-2.5 py-1 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-md border border-zinc-700/60 transition-colors flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3" /> Full Video
          </button>
        </div>

        {/* Live Clip Duration Display */}
        <div className="flex items-center gap-2">
          {isValid ? (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-xs">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-zinc-400">Clip Duration:</span>
              <span className="font-mono font-bold text-emerald-300">
                {secondsToTime(clipLength, forceHours)}
              </span>
              <span className="text-zinc-500 text-[11px]">({Math.round(clipLength)}s)</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 border border-red-500/30 rounded-lg text-xs">
              <AlertCircle className="w-3.5 h-3.5 text-red-400" />
              <span className="text-red-300 font-medium">
                {inputError || 'End time must be greater than start time'}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
