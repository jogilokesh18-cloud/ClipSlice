module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(200).json({
    status: 'healthy',
    mode: 'vercel-serverless',
    timestamp: new Date().toISOString()
  });
};
