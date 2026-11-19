// Vercel Serverless Function for Video Metadata (CommonJS for universal Node compatibility)
module.exports = async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { url } = req.body || {};
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ success: false, error: 'Valid video URL is required.' });
  }

  const targetUrl = url.trim();

  try {
    // 1. YouTube handling
    if (targetUrl.includes('youtube.com') || targetUrl.includes('youtu.be')) {
      const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(targetUrl)}&format=json`;
      const oembedRes = await fetch(oembedUrl);
      if (!oembedRes.ok) {
        throw new Error('Video is private, restricted, or not found on YouTube.');
      }
      const oembed = await oembedRes.json();

      let duration = 300;
      try {
        const pageRes = await fetch(targetUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
        });
        const pageHtml = await pageRes.text();
        const match = pageHtml.match(/"approxDurationMs":"(\d+)"/);
        if (match && match[1]) {
          duration = Math.max(1, Math.round(parseInt(match[1], 10) / 1000));
        }
      } catch {
        // Fallback default duration
      }

      return res.status(200).json({
        success: true,
        metadata: {
          title: oembed.title || 'YouTube Video',
          thumbnail: oembed.thumbnail_url || '',
          duration,
          uploader: oembed.author_name || 'YouTube',
          platform: 'youtube',
          displayPlatform: 'YouTube',
          url: targetUrl,
          resolutions: [
            { label: 'Best', height: 1080 },
            { label: '1080p', height: 1080 },
            { label: '720p', height: 720 },
            { label: '480p', height: 480 },
            { label: '360p', height: 360 },
          ],
        },
      });
    }

    // 2. Vimeo handling
    if (targetUrl.includes('vimeo.com')) {
      const oembedUrl = `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(targetUrl)}`;
      const oembedRes = await fetch(oembedUrl);
      if (!oembedRes.ok) {
        throw new Error('Vimeo video not found or private.');
      }
      const oembed = await oembedRes.json();
      return res.status(200).json({
        success: true,
        metadata: {
          title: oembed.title || 'Vimeo Video',
          thumbnail: oembed.thumbnail_url || '',
          duration: oembed.duration || 180,
          uploader: oembed.author_name || 'Vimeo',
          platform: 'vimeo',
          displayPlatform: 'Vimeo',
          url: targetUrl,
          resolutions: [
            { label: 'Best', height: 1080 },
            { label: '1080p', height: 1080 },
            { label: '720p', height: 720 },
            { label: '480p', height: 480 },
          ],
        },
      });
    }

    // 3. Fallback for other platforms
    return res.status(200).json({
      success: true,
      metadata: {
        title: 'Video Clip',
        thumbnail: '',
        duration: 180,
        uploader: 'Web Video',
        platform: 'direct',
        displayPlatform: 'Direct Video',
        url: targetUrl,
        resolutions: [
          { label: 'Best', height: 1080 },
          { label: '720p', height: 720 },
          { label: '480p', height: 480 },
        ],
      },
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      error: err instanceof Error ? err.message : 'Failed to fetch video details.',
    });
  }
};
