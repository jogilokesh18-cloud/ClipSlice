module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  return res.status(400).json({
    success: false,
    error: 'Video cutting requires FFmpeg and yt-dlp, which cannot run in Vercel serverless. Please run ClipSlice locally (http://localhost:5000) or deploy on Render using Docker.'
  });
};
