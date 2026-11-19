# ClipSlice 🎬✂️

> **Precise, lossless web video trimmer and clip downloader.**  
> Paste any video URL (YouTube, Vimeo, X / Twitter, Twitch, or direct video link), specify exact start and end timestamps, and download **only the requested segment** in seconds—without ever downloading the entire video.

---

## ⚡ Highlights

- **Selective Segment Downloading**: Uses `yt-dlp --download-sections` and `FFmpeg` to request and stream only the specific byte ranges/fragments for your requested time window. Saves massive bandwidth and completes trims in 2–5 seconds.
- **Zero-Download Metadata Inspection**: Fetches title, thumbnail, duration, and available resolutions (`1080p`, `720p`, `480p`, `360p`, `Best`) instantaneously via `--dump-single-json`.
- **Interactive Dual-Thumb Range Slider**: Visual timeline bar with draggable Start and End thumbs, live hover tooltips, and segment duration indicators.
- **Synchronized Time Inputs**: Two-way binding supporting both `MM:SS` and `HH:MM:SS` (e.g., `03:05` to `04:06`), quick preset buttons, and `±1s` / `±5s` nudge buttons.
- **Format & Quality Selection**:
  - **MP4**: Video + Audio with resolution selector (`1080p`, `720p`, `480p`, `Best`).
  - **MP3**: High-quality audio extraction.
- **Real-Time Progress Tracking**: Server-Sent Events (SSE) stream live progress percentages, download speed (e.g. `4.2 MB/s`), and estimated time remaining (ETA).
- **In-Browser Preview Player**: Built-in HTML5 video and audio player with HTTP 206 Partial Content (range requests) for instant seeking and playback before saving.
- **One-Click Download**: Direct attachment download with clean sanitized filenames (e.g., `ClipSlice_Title_01m20s-02m15s.mp4`).
- **Security & Auto-Cleanup**:
  - Safe process execution via argument arrays (`child_process.spawn`) without shell injection.
  - Strict URL validation & anti-SSRF protections (blocks private, loopback, and internal IPs).
  - Rate limiting per IP to prevent service exhaustion.
  - Automatic background cleanup of temporary video files older than 15 minutes.
- **Modern Dark-Mode UI**: Sleek, centered single-column layout crafted with Tailwind CSS, Lucide icons, and ambient glows.

---

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Lucide React
- **Backend**: Node.js, Express, TypeScript, `express-rate-limit`, `uuid`
- **Core Processing Engine**: `yt-dlp` (stream manifest resolution & selective section download) + `FFmpeg` (keyframe cut, transcoding, and remuxing)

---

## 📋 Prerequisites & Tool Setup

ClipSlice requires **Node.js (v18+)**, **yt-dlp**, and **FFmpeg** installed on your system and accessible via PATH (or custom environment variables).

### 1. Windows Setup

#### Using Windows Package Manager (`winget` - Recommended):
```powershell
# Install Node.js LTS
winget install OpenJS.NodeJS.LTS

# Install FFmpeg (Gyan build)
winget install Gyan.FFmpeg

# Install Python & yt-dlp
winget install Python.Python.3.12
python -m pip install -U yt-dlp
```

#### Alternatively via Scoop or Chocolatey:
```powershell
# Scoop
scoop install ffmpeg yt-dlp nodejs

# Chocolatey
choco install ffmpeg yt-dlp nodejs
```

### 2. macOS Setup

```bash
# Using Homebrew
brew install node ffmpeg yt-dlp
```

### 3. Linux (Ubuntu / Debian) Setup

```bash
# Node.js
sudo apt update && sudo apt install -y nodejs npm

# FFmpeg
sudo apt install -y ffmpeg

# yt-dlp
sudo wget https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -O /usr/local/bin/yt-dlp
sudo chmod a+rx /usr/local/bin/yt-dlp
```

### 4. Verify Installation

Run the following commands in your terminal to ensure prerequisites are properly recognized:
```bash
node -v
yt-dlp --version
ffmpeg -version
```

*(Optional)* You can specify custom binary locations via environment variables:
```bash
# .env in clipslice/backend/
YTDLP_PATH="C:\path\to\yt-dlp.exe"
FFMPEG_PATH="C:\path\to\ffmpeg.exe"
FFPROBE_PATH="C:\path\to\ffprobe.exe"
PORT=5000
```

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
# From clipslice/ directory:
npm run build --prefix backend
npm run build --prefix frontend
```

### 2. Run Development Mode

Open two terminal tabs:

**Terminal 1 (Backend API on http://localhost:5000):**
```bash
cd backend
npm run dev
```

**Terminal 2 (Frontend with Vite HMR on http://localhost:5173):**
```bash
cd frontend
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser!

### 3. Run Production Build (Single Unified Server)

You can build the frontend and serve both the API and UI directly from Express:

```bash
# Build both frontend and backend
npm run build

# Start the unified production server
npm start
```

Now open [http://localhost:5000](http://localhost:5000) directly in your browser.
