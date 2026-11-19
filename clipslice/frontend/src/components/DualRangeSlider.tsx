import React, { useRef, useState, useEffect, useCallback } from 'react';
import { secondsToTime } from '../utils/timeFormat';

interface DualRangeSliderProps {
  duration: number; // total seconds
  startTime: number;
  endTime: number;
  onChange: (start: number, end: number) => void;
  disabled?: boolean;
}

export const DualRangeSlider: React.FC<DualRangeSliderProps> = ({
  duration,
  startTime,
  endTime,
  onChange,
  disabled = false,
}) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const [activeThumb, setActiveThumb] = useState<'start' | 'end' | null>(null);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverPos, setHoverPos] = useState<number | null>(null);

  // Safeguards
  const safeDuration = Math.max(1, duration);
  const safeStart = Math.max(0, Math.min(startTime, safeDuration));
  const safeEnd = Math.max(safeStart, Math.min(endTime, safeDuration));

  const startPercent = (safeStart / safeDuration) * 100;
  const endPercent = (safeEnd / safeDuration) * 100;

  // Convert mouse X to seconds
  const getSecondsFromEvent = useCallback(
    (clientX: number): number => {
      if (!trackRef.current) return 0;
      const rect = trackRef.current.getBoundingClientRect();
      const clickX = Math.max(0, Math.min(clientX - rect.left, rect.width));
      const percentage = clickX / rect.width;
      return Math.round(percentage * safeDuration);
    },
    [safeDuration]
  );

  // Global mousemove and mouseup listeners when dragging
  useEffect(() => {
    if (!activeThumb) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newSec = getSecondsFromEvent(e.clientX);
      if (activeThumb === 'start') {
        const boundedStart = Math.min(newSec, safeEnd - 1);
        onChange(Math.max(0, boundedStart), safeEnd);
      } else if (activeThumb === 'end') {
        const boundedEnd = Math.max(newSec, safeStart + 1);
        onChange(safeStart, Math.min(safeDuration, boundedEnd));
      }
    };

    const handleMouseUp = () => {
      setActiveThumb(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', (e) => {
      if (e.touches.length > 0) handleMouseMove(e.touches[0] as unknown as MouseEvent);
    });
    window.addEventListener('touchend', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [activeThumb, safeStart, safeEnd, safeDuration, onChange, getSecondsFromEvent]);

  // Handle clicking directly on the track
  const handleTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (disabled || activeThumb) return;
    const clickSec = getSecondsFromEvent(e.clientX);

    // Determine which thumb is closer
    const distToStart = Math.abs(clickSec - safeStart);
    const distToEnd = Math.abs(clickSec - safeEnd);

    if (distToStart < distToEnd) {
      const boundedStart = Math.min(clickSec, safeEnd - 1);
      onChange(Math.max(0, boundedStart), safeEnd);
    } else {
      const boundedEnd = Math.max(clickSec, safeStart + 1);
      onChange(safeStart, Math.min(safeDuration, boundedEnd));
    }
  };

  const handleMouseMoveOverTrack = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const sec = Math.round((x / rect.width) * safeDuration);
    setHoverTime(sec);
    setHoverPos(x);
  };

  const handleMouseLeaveTrack = () => {
    setHoverTime(null);
    setHoverPos(null);
  };

  const formatTick = (sec: number) => secondsToTime(sec, safeDuration >= 3600);

  return (
    <div className="w-full select-none py-4">
      {/* Slider Bar Container */}
      <div
        ref={trackRef}
        onClick={handleTrackClick}
        onMouseMove={handleMouseMoveOverTrack}
        onMouseLeave={handleMouseLeaveTrack}
        className={`relative h-5 rounded-full bg-zinc-800/80 border border-zinc-700/60 cursor-pointer shadow-inner ${
          disabled ? 'opacity-50 pointer-events-none' : ''
        }`}
      >
        {/* Hover Time Indicator */}
        {hoverTime !== null && hoverPos !== null && !activeThumb && (
          <div
            className="absolute -top-8 -translate-x-1/2 pointer-events-none z-20"
            style={{ left: `${hoverPos}px` }}
          >
            <div className="bg-zinc-800 border border-zinc-600 text-zinc-200 text-xs font-mono py-0.5 px-2 rounded shadow-md whitespace-nowrap">
              {formatTick(hoverTime)}
            </div>
          </div>
        )}

        {/* Selected Range Highlight Fill */}
        <div
          className="absolute top-0 bottom-0 rounded-full bg-gradient-to-r from-cyan-500 to-emerald-400 shadow-[0_0_12px_rgba(6,182,212,0.4)] transition-all duration-75"
          style={{
            left: `${startPercent}%`,
            width: `${Math.max(0, endPercent - startPercent)}%`,
          }}
        />

        {/* Start Thumb (Left) */}
        <div
          role="slider"
          aria-label="Start time"
          aria-valuenow={safeStart}
          aria-valuemin={0}
          aria-valuemax={safeEnd}
          onMouseDown={(e) => {
            e.stopPropagation();
            setActiveThumb('start');
          }}
          onTouchStart={(e) => {
            e.stopPropagation();
            setActiveThumb('start');
          }}
          className={`slider-thumb absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-zinc-900 border-2 border-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.6)] flex items-center justify-center transition-transform hover:scale-110 ${
            activeThumb === 'start' ? 'scale-125 border-cyan-300 ring-4 ring-cyan-500/30' : ''
          }`}
          style={{ left: `${startPercent}%` }}
        >
          {/* Inner Dot */}
          <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />

          {/* Floating Start Tooltip */}
          <div
            className={`absolute -top-8 font-mono text-[11px] font-semibold tracking-wide px-2 py-0.5 rounded shadow-lg border whitespace-nowrap transition-all ${
              activeThumb === 'start'
                ? 'bg-cyan-500 text-zinc-950 border-cyan-300 scale-105'
                : 'bg-zinc-900 text-cyan-300 border-zinc-700'
            }`}
          >
            {formatTick(safeStart)}
          </div>
        </div>

        {/* End Thumb (Right) */}
        <div
          role="slider"
          aria-label="End time"
          aria-valuenow={safeEnd}
          aria-valuemin={safeStart}
          aria-valuemax={safeDuration}
          onMouseDown={(e) => {
            e.stopPropagation();
            setActiveThumb('end');
          }}
          onTouchStart={(e) => {
            e.stopPropagation();
            setActiveThumb('end');
          }}
          className={`slider-thumb absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-zinc-900 border-2 border-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.6)] flex items-center justify-center transition-transform hover:scale-110 ${
            activeThumb === 'end' ? 'scale-125 border-emerald-300 ring-4 ring-emerald-500/30' : ''
          }`}
          style={{ left: `${endPercent}%` }}
        >
          {/* Inner Dot */}
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />

          {/* Floating End Tooltip */}
          <div
            className={`absolute -top-8 font-mono text-[11px] font-semibold tracking-wide px-2 py-0.5 rounded shadow-lg border whitespace-nowrap transition-all ${
              activeThumb === 'end'
                ? 'bg-emerald-500 text-zinc-950 border-emerald-300 scale-105'
                : 'bg-zinc-900 text-emerald-300 border-zinc-700'
            }`}
          >
            {formatTick(safeEnd)}
          </div>
        </div>
      </div>

      {/* Markers & Timestamps */}
      <div className="flex justify-between items-center mt-3 text-xs text-zinc-500 font-mono select-none px-1">
        <span>00:00</span>
        <span>{formatTick(Math.round(safeDuration * 0.25))}</span>
        <span>{formatTick(Math.round(safeDuration * 0.5))}</span>
        <span>{formatTick(Math.round(safeDuration * 0.75))}</span>
        <span>{formatTick(safeDuration)}</span>
      </div>
    </div>
  );
};
