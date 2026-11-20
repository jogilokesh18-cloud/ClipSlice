const fs = require('fs');
const path = require('path');

const src = path.resolve(__dirname, '..', 'clipslice', 'frontend', 'dist');
const distDest = path.resolve(__dirname, '..', 'dist');
const cutDest = path.resolve(__dirname, '..', 'cut');

if (fs.existsSync(src)) {
  // 1. Copy to dist/
  if (fs.existsSync(distDest)) {
    fs.rmSync(distDest, { recursive: true, force: true });
  }
  fs.cpSync(src, distDest, { recursive: true });
  console.log('[Build] Successfully copied frontend to root dist/ for Vercel/Render hosting.');

  // 2. Also copy to cut/ (prevents Render "Publish directory cut does not exist" error)
  if (fs.existsSync(cutDest)) {
    fs.rmSync(cutDest, { recursive: true, force: true });
  }
  fs.cpSync(src, cutDest, { recursive: true });
  console.log('[Build] Successfully copied frontend to root cut/ directory.');
} else {
  console.warn('[Build] Warning: frontend dist folder not found at', src);
}
