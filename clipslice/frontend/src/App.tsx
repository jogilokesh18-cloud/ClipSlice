import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { UrlInputBar } from './components/UrlInputBar';
import { VideoInfoCard } from './components/VideoInfoCard';
import { DualRangeSlider } from './components/DualRangeSlider';
import { TimeControls } from './components/TimeControls';
import { FormatQualitySelector } from './components/FormatQualitySelector';
import { ProgressCard } from './components/ProgressCard';
import { PreviewDownloadCard } from './components/PreviewDownloadCard';
import { Toast, ToastMessage } from './components/Toast';
import { VideoMetadata, OutputFormat, JobProgress, ClipSpeedMode } from './types';
import { Scissors, ShieldCheck, Sparkles, Zap } from 'lucide-react';

export const App: React.FC = () => {
  const [url, setUrl] = useState<string>('');
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null);
  const [isLoadingMeta, setIsLoadingMeta] = useState<boolean>(false);

  // Trimming State
  const [startTime, setStartTime] = useState<number>(0);
  const [endTime, setEndTime] = useState<number>(30);
  const [format, setFormat] = useState<OutputFormat>('mp4');
  const [quality, setQuality] = useState<string>('Best');
  const [mode, setMode] = useState<ClipSpeedMode>('fast');

  // Job & Progress State
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [progress, setProgress] = useState<JobProgress | null>(null);

  // Notification Toast
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const pollingRef = useRef<number | null>(null);

  // Cleanup event sources on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) eventSourceRef.current.close();
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  const showToast = (type: 'error' | 'success' | 'info', message: string, title?: string) => {
    setToast({
      id: Math.random().toString(),
      type,
      message,
      title,
    });
  };

  // Fetch metadata when user submits URL
  const handleFetchMetadata = async (targetUrl: string) => {
    setIsLoadingMeta(true);
    setMetadata(null);
    setProgress(null);
    setJobId(null);

    try {
      const res = await fetch('/api/metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: targetUrl }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to fetch video details.');
      }

      const meta: VideoMetadata = data.metadata;
      setMetadata(meta);
      setStartTime(0);
      // Default clip range: first 30 seconds or full video if shorter
      setEndTime(meta.duration > 0 ? Math.min(30, meta.duration) : 30);
      setQuality('Best');
      showToast('success', `Found "${meta.title}" (${meta.displayPlatform})`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not fetch video information.';
      showToast('error', msg, 'Metadata Error');
    } finally {
      setIsLoadingMeta(false);
    }
  };

  // Handle Start Slicing
  const handleStartSlice = async () => {
    if (!metadata) return;

    if (endTime <= startTime) {
      showToast('error', 'End time must be greater than Start time.');
      return;
    }

    if (endTime - startTime < 0.5) {
      showToast('error', 'Selected clip must be at least 0.5 seconds long.');
      return;
    }

    setIsSubmitting(true);
    setProgress({
      id: 'pending',
      status: 'queued',
      progress: 0,
      stage: 'Initiating clip request...',
    });

    try {
      const res = await fetch('/api/clip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: metadata.url,
          title: metadata.title,
          startTime,
          endTime,
          format,
          quality,
          mode,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to start clip trimming.');
      }

      const newJobId = data.jobId;
      setJobId(newJobId);
      subscribeToJobProgress(newJobId);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to slice clip.';
      showToast('error', msg, 'Processing Failed');
      setProgress({
        id: 'error',
        status: 'error',
        progress: 0,
        stage: 'Failed',
        error: msg,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Subscribe to live SSE progress updates with polling fallback
  const subscribeToJobProgress = (activeJobId: string) => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }

    const sse = new EventSource(`/api/progress/${activeJobId}`);
    eventSourceRef.current = sse;

    sse.onmessage = (event) => {
      try {
        const update: JobProgress = JSON.parse(event.data);
        setProgress(update);

        if (update.status === 'completed' || update.status === 'error') {
          sse.close();
          if (pollingRef.current) clearInterval(pollingRef.current);
        }
      } catch (err) {
        console.error('Error parsing SSE event:', err);
      }
    };

    sse.onerror = () => {
      // If SSE connection fails, fallback to polling
      sse.close();
      if (!pollingRef.current) {
        pollingRef.current = window.setInterval(async () => {
          try {
            const res = await fetch(`/api/job/${activeJobId}`);
            if (res.ok) {
              const d = await res.json();
              if (d.success && d.job) {
                setProgress(d.job);
                if (d.job.status === 'completed' || d.job.status === 'error') {
                  if (pollingRef.current) clearInterval(pollingRef.current);
                }
              }
            }
          } catch {
            // ignore polling network errors
          }
        }, 1000);
      }
    };
  };

  // Cancel Job
  const handleCancelJob = async () => {
    if (!jobId) return;
    try {
      await fetch(`/api/job/${jobId}`, { method: 'DELETE' });
    } catch {
      // ignore
    }
    if (eventSourceRef.current) eventSourceRef.current.close();
    if (pollingRef.current) clearInterval(pollingRef.current);
    setProgress(null);
    setJobId(null);
    showToast('info', 'Clip processing cancelled.');
  };

  // Reset to trim another section
  const handleReset = () => {
    if (eventSourceRef.current) eventSourceRef.current.close();
    if (pollingRef.current) clearInterval(pollingRef.current);
    setProgress(null);
    setJobId(null);
  };

  const isCompleted = progress?.status === 'completed';
  const isProcessing: boolean = !!(progress && (
    progress.status === 'queued' ||
    progress.status === 'fetching' ||
    progress.status === 'downloading' ||
    progress.status === 'processing'
  ));

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col justify-between selection:bg-cyan-500/20 selection:text-cyan-300">
      {/* Background Glow Accents */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-cyan-500/10 blur-[130px] rounded-full" />
        <div className="absolute top-48 left-1/3 w-[400px] h-[300px] bg-emerald-500/5 blur-[120px] rounded-full" />
      </div>

      {/* Main Single-Column Container */}
      <main className="relative z-10 max-w-3xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">
        {/* Header */}
        <Header />

        {/* URL Input Bar */}
        <div className="space-y-2">
          <UrlInputBar
            url={url}
            onChange={setUrl}
            onSubmit={handleFetchMetadata}
            isLoading={isLoadingMeta}
            disabled={isProcessing}
          />
        </div>

        {/* Loaded Video Metadata & Trimming Controls */}
        {metadata && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            {/* Metadata Card */}
            <VideoInfoCard metadata={metadata} />

            {/* Trimming Workbench Card */}
            <div className="bg-zinc-900/80 border border-zinc-800/90 rounded-2xl p-5 sm:p-7 shadow-2xl backdrop-blur-xl space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                  <Scissors className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-200">
                    Trimming Timeline
                  </h3>
                </div>
                <span className="text-xs text-zinc-500">
                  Drag handles or edit timestamps below
                </span>
              </div>

              {/* Dual-Thumb Interactive Range Slider */}
              <DualRangeSlider
                duration={metadata.duration}
                startTime={startTime}
                endTime={endTime}
                onChange={(newStart, newEnd) => {
                  setStartTime(newStart);
                  setEndTime(newEnd);
                }}
                disabled={isProcessing}
              />

              {/* Synchronized Time Inputs & Nudges */}
              <TimeControls
                duration={metadata.duration}
                startTime={startTime}
                endTime={endTime}
                onChange={(newStart, newEnd) => {
                  setStartTime(newStart);
                  setEndTime(newEnd);
                }}
                disabled={isProcessing}
              />

              {/* Format & Quality Pickers */}
              <FormatQualitySelector
                format={format}
                onFormatChange={setFormat}
                quality={quality}
                onQualityChange={setQuality}
                availableResolutions={metadata.resolutions}
                mode={mode}
                onModeChange={setMode}
                disabled={isProcessing}
              />

              {/* Primary Slice CTA Button */}
              {!isProcessing && !isCompleted && (
                <button
                  type="button"
                  onClick={handleStartSlice}
                  disabled={isSubmitting || endTime <= startTime}
                  className="w-full py-4 px-6 rounded-xl font-bold text-base bg-gradient-to-r from-cyan-500 via-indigo-500 to-emerald-400 hover:from-cyan-400 hover:to-emerald-300 text-zinc-950 shadow-xl shadow-cyan-500/20 transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2.5 disabled:opacity-40 disabled:pointer-events-none"
                >
                  {mode === 'fast' ? <Zap className="w-5 h-5 fill-current" /> : <Scissors className="w-5 h-5 stroke-[2.5]" />}
                  <span>
                    {mode === 'fast' ? '⚡ Slice Instantly (Lightning Mode)' : '🎯 Slice Clip (Frame Accurate)'} • {format.toUpperCase()}
                  </span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Live Progress Card */}
        {progress && !isCompleted && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
            <ProgressCard progress={progress} onCancel={handleCancelJob} />
          </div>
        )}

        {/* Preview Player & Direct Download Card */}
        {progress && isCompleted && (
          <div className="animate-in fade-in zoom-in-95 duration-300">
            <PreviewDownloadCard progress={progress} onReset={handleReset} />
          </div>
        )}
      </main>

      {/* Modern Footer */}
      <footer className="relative z-10 border-t border-zinc-900 bg-zinc-950/80 py-8 px-4 text-center text-xs text-zinc-500 space-y-2">
        <div className="flex items-center justify-center gap-4 flex-wrap text-zinc-400">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-cyan-400" /> Safe process spawning (No shell injection)
          </span>
          <span>•</span>
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-emerald-400" /> yt-dlp & FFmpeg section trimming
          </span>
          <span>•</span>
          <span>Automatic 15-minute file cleanup</span>
        </div>
        <p className="text-zinc-600">
          ClipSlice © 2026 • Designed for precise, lightning-fast video clipping.
        </p>
      </footer>

      {/* Global Toast Notification */}
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
};

export default App;
