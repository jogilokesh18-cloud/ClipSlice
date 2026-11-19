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

### 1. Clone & Enter the Directory
```bash
cd "c:\Users\jogil\OneDrive\Desktop\video clip cut\clipslice"
```

### 2. Install Dependencies
```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install

cd ..
```

### 3. Run Development Mode

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

### 4. Run Production Build (Single Unified Server)

You can build the frontend and serve both the API and UI directly from Express:

```bash
# From clipslice/ root:
npm run build

# Start the unified production server
npm start
```

Now open [http://localhost:5000](http://localhost:5000) directly in your browser.

---

## 🎯 How to Use ClipSlice

1. **Paste Video URL**: Paste any link from YouTube, Vimeo, X / Twitter, Twitch, or a direct `.mp4` / `.m3u8` link.
2. **Fetch Metadata**: Click **Fetch** (or press Enter). ClipSlice displays the title, duration, creator, and available resolutions without downloading the video.
3. **Select Time Range**:
   - Drag the **Start (Cyan)** and **End (Emerald)** thumbs on the timeline slider.
   - Or type the exact timestamps in the input boxes (e.g. `03:05` to `04:06`).
   - Use the **±1s / ±5s** nudge buttons or **Presets** (First 30s, First 1 min, Full Video) for quick adjustments.
4. **Choose Format & Quality**:
   - Select **MP4 Video** (choose between `1080p`, `720p`, `480p`, or `Best`) or **MP3 Audio** (audio only).
5. **Slice & Download**:
   - Click **Cut & Download Clip**.
   - Watch real-time progress via Server-Sent Events.
   - When finished, preview the trimmed clip in the in-browser video/audio player.
   - Click **Download Trimmed Clip** to save the file with a clean title and timestamped filename.
   - Temporary server files automatically delete after 15 minutes.

---

## 🛡️ Security Architecture

- **No Shell Injection**: All external process spawns (`yt-dlp`, `ffmpeg`, `ffprobe`) use `child_process.spawn` with argument vectors and `shell: false`. No untrusted input is ever evaluated in a shell.
- **SSRF Prevention**: URL validator validates protocol (`http:` / `https:`) and strictly forbids `localhost`, `127.0.0.1`, RFC 1918 private IPv4 subnets, link-local addresses, and decimal/hex IP notations.
- **Rate Limiting**: Built-in sliding-window rate limiters prevent API flooding and excessive concurrent FFmpeg operations per IP.
- **Automatic Garbage Collection**: Background scheduler sweeps `temp/` every 60 seconds, purging any file older than 15 minutes.

---

## 📄 License

MIT License. Designed and built with ❤️.
