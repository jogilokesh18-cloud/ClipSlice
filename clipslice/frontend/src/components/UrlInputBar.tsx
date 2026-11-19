import React, { useState } from 'react';
import { Search, Clipboard, X, Loader2, PlayCircle, Sparkles } from 'lucide-react';

interface UrlInputBarProps {
  url: string;
  onChange: (url: string) => void;
  onSubmit: (url: string) => void;
  isLoading: boolean;
  disabled?: boolean;
}

const SAMPLE_VIDEOS = [
  {
    name: 'YouTube: Me at the zoo (19s)',
    url: 'https://www.youtube.com/watch?v=jNQXAC9IVRw',
  },
  {
    name: 'YouTube: Blender Animation (52s)',
    url: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
  },
  {
    name: 'Vimeo: The Mountain',
    url: 'https://vimeo.com/22439234',
  },
];

export const UrlInputBar: React.FC<UrlInputBarProps> = ({
  url,
  onChange,
  onSubmit,
  isLoading,
  disabled = false,
}) => {
  const [pasteSuccess, setPasteSuccess] = useState(false);

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        onChange(text.trim());
        setPasteSuccess(true);
        setTimeout(() => setPasteSuccess(false), 2000);
      }
    } catch {
      // In case clipboard permissions are blocked
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim() && !isLoading && !disabled) {
      onSubmit(url.trim());
    }
  };

  return (
    <div className="w-full space-y-3">
      <form onSubmit={handleSubmit} className="relative flex items-center">
        <div className="absolute left-4 text-zinc-500 pointer-events-none">
          <Search className="w-5 h-5" />
        </div>

        <input
          type="text"
          value={url}
          onChange={(e) => onChange(e.target.value)}
          disabled={isLoading || disabled}
          placeholder="Paste YouTube, Vimeo, X, Twitch, or direct video link..."
          className="w-full bg-zinc-900/90 text-zinc-100 placeholder-zinc-500 pl-12 pr-32 py-4 rounded-2xl border border-zinc-800 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 text-sm sm:text-base shadow-xl transition-all"
        />

        <div className="absolute right-2.5 flex items-center gap-1.5">
          {url && !isLoading && (
            <button
              type="button"
              onClick={() => onChange('')}
              className="p-2 text-zinc-500 hover:text-zinc-300 rounded-lg transition-colors"
              title="Clear input"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {!url && (
            <button
              type="button"
              onClick={handlePaste}
              className={`hidden sm:flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                pasteSuccess
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700'
              }`}
              title="Paste from clipboard"
            >
              <Clipboard className="w-3.5 h-3.5" />
              <span>{pasteSuccess ? 'Pasted!' : 'Paste'}</span>
            </button>
          )}

          <button
            type="submit"
            disabled={!url.trim() || isLoading || disabled}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-zinc-950 font-bold text-sm rounded-xl shadow-md shadow-cyan-500/20 transition-all disabled:opacity-40 disabled:pointer-events-none"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="hidden sm:inline">Fetching...</span>
              </>
            ) : (
              <>
                <PlayCircle className="w-4 h-4" />
                <span>Fetch</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Quick Test Samples */}
      <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400 px-1">
        <span className="text-zinc-500 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-cyan-400" /> Try sample:
        </span>
        {SAMPLE_VIDEOS.map((sample) => (
          <button
            key={sample.name}
            type="button"
            disabled={isLoading || disabled}
            onClick={() => {
              onChange(sample.url);
              onSubmit(sample.url);
            }}
            className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-lg border border-zinc-800 transition-colors text-[11px]"
          >
            {sample.name}
          </button>
        ))}
      </div>
    </div>
  );
};
