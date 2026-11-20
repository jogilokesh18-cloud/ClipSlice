# Production container for ClipSlice
FROM node:20-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    python3 \
    python3-minimal \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
    && chmod a+rx /usr/local/bin/yt-dlp

WORKDIR /app

COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/

RUN cd backend && npm install --no-audit
RUN cd frontend && npm install --no-audit

COPY . .

RUN cd backend && npm run build
RUN cd frontend && npm run build

ENV NODE_ENV=production
ENV PORT=5000

EXPOSE 5000

CMD ["node", "backend/dist/server.js"]
