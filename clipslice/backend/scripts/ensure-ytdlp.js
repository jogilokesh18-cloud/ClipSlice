const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

const binDir = path.resolve(__dirname, '..', 'bin');
const isWin = process.platform === 'win32';
const targetBinary = path.join(binDir, isWin ? 'yt-dlp.exe' : 'yt-dlp');

async function ensureYtDlp() {
  if (!fs.existsSync(binDir)) {
    fs.mkdirSync(binDir, { recursive: true });
  }

  // Check if already downloaded in local bin
  if (fs.existsSync(targetBinary)) {
    console.log(`[Setup] Local yt-dlp binary exists at: ${targetBinary}`);
    try {
      if (!isWin) {
        fs.chmodSync(targetBinary, '755');
      }
    } catch {}
    return;
  }

  if (!fs.existsSync(binDir)) {
    fs.mkdirSync(binDir, { recursive: true });
  }

  const url = isWin
    ? 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe'
    : 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp';

  console.log(`[Setup] Downloading standalone yt-dlp from ${url}...`);

  function download(downloadUrl) {
    return new Promise((resolve, reject) => {
      https.get(downloadUrl, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return download(res.headers.location).then(resolve).catch(reject);
        }
        if (res.statusCode !== 200) {
          return reject(new Error(`Download failed with status ${res.statusCode}`));
        }
        const fileStream = fs.createWriteStream(targetBinary);
        res.pipe(fileStream);
        fileStream.on('finish', () => {
          fileStream.close();
          try {
            if (!isWin) {
              fs.chmodSync(targetBinary, '755');
            }
          } catch {}
          console.log(`[Setup] Successfully installed yt-dlp to: ${targetBinary}`);
          resolve();
        });
        fileStream.on('error', reject);
      }).on('error', reject);
    });
  }

  await download(url);
}

ensureYtDlp().catch((err) => {
  console.warn(`[Setup] Note: could not download local yt-dlp (${err.message}). Using system fallback.`);
});
