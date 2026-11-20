# Production container for ClipSlice Backend
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

WORKDIR /app

# Copy package configurations and install dependencies
COPY package*.json ./
RUN npm install --no-audit

# Copy backend source and assets
COPY . .

# Build backend
RUN npm run build

ENV NODE_ENV=production
ENV PORT=5000

EXPOSE 5000

CMD ["node", "dist/server.js"]
