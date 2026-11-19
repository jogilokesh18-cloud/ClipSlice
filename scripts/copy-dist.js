const fs = require('fs');
const path = require('path');

const src = path.resolve(__dirname, '..', 'clipslice', 'frontend', 'dist');
const dest = path.resolve(__dirname, '..', 'dist');

if (fs.existsSync(src)) {
  if (fs.existsSync(dest)) {
    fs.rmSync(dest, { recursive: true, force: true });
  }
  fs.cpSync(src, dest, { recursive: true });
  console.log('[Build] Successfully copied frontend dist to root dist for Vercel hosting.');
} else {
  console.warn('[Build] Warning: frontend dist folder not found at', src);
}
