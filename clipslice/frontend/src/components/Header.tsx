import React from 'react';
import { Scissors, Zap } from 'lucide-react';

export const Header: React.FC = () => {
  return (
    <header className="text-center space-y-4 pt-6 pb-2">
      {/* Top pill badge */}
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs font-medium">
        <Zap className="w-3.5 h-3.5 text-cyan-400" />
        <span>Lossless Fast Trimming • Zero Full Downloads</span>
      </div>

      {/* Main Logo & Title */}
      <div className="flex items-center justify-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 via-indigo-500 to-emerald-400 p-[2px] shadow-[0_0_25px_rgba(6,182,212,0.35)]">
          <div className="w-full h-full bg-zinc-950 rounded-[14px] flex items-center justify-center">
            <Scissors className="w-6 h-6 text-cyan-400" />
          </div>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
          Clip<span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400">Slice</span>
        </h1>
      </div>

      {/* Subtitle */}
      <p className="max-w-xl mx-auto text-sm sm:text-base text-zinc-400 leading-relaxed">
        Paste any video URL, set your exact start and end times, and download only the trimmed segment in seconds.
      </p>

      {/* Supported Platforms Strip */}
      <div className="flex items-center justify-center gap-2 sm:gap-3 flex-wrap text-xs text-zinc-400 pt-1">
        <span className="flex items-center gap-1 bg-zinc-900/80 px-2.5 py-1 rounded-lg border border-zinc-800">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> YouTube
        </span>
        <span className="flex items-center gap-1 bg-zinc-900/80 px-2.5 py-1 rounded-lg border border-zinc-800">
          <span className="w-1.5 h-1.5 rounded-full bg-sky-400" /> Vimeo
        </span>
        <span className="flex items-center gap-1 bg-zinc-900/80 px-2.5 py-1 rounded-lg border border-zinc-800">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400" /> X (Twitter)
        </span>
        <span className="flex items-center gap-1 bg-zinc-900/80 px-2.5 py-1 rounded-lg border border-zinc-800">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-500" /> Twitch
        </span>
        <span className="flex items-center gap-1 bg-zinc-900/80 px-2.5 py-1 rounded-lg border border-zinc-800">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Direct MP4
        </span>
      </div>
    </header>
  );
};
