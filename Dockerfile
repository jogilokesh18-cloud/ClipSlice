# Multi-stage production container for ClipSlice (Full-Stack Video Trimmer)
FROM node:20-bookworm-slim

# Install system dependencies: FFmpeg, Python, curl, ca-certificates
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    python3 \
    python3-minimal \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install latest yt-dlp binary
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
    && chmod a+rx /usr/local/bin/yt-dlp

# Set working directory
WORKDIR /app

# Copy package configurations
COPY package.json ./
COPY clipslice/backend/package*.json ./clipslice/backend/
COPY clipslice/frontend/package*.json ./clipslice/frontend/

# Install dependencies
RUN cd clipslice/backend && npm install --no-audit
RUN cd clipslice/frontend && npm install --no-audit

# Copy full application source code
COPY . .

# Build backend and frontend
RUN cd clipslice/backend && npm run build
RUN cd clipslice/frontend && npm run build

# Set environment variables
ENV NODE_ENV=production
ENV PORT=5000

# Expose standard port
EXPOSE 5000

# Start server
CMD ["node", "clipslice/backend/dist/server.js"]
