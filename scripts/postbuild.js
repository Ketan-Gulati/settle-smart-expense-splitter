const fs = require('fs');
const path = require('path');

const distPath = path.resolve(__dirname, '../dist');
const publicPath = path.resolve(__dirname, '../public');

// Copy public assets to dist
if (fs.existsSync(publicPath)) {
  fs.cpSync(publicPath, distPath, { recursive: true });
  console.log('✅ Copied public PWA assets to dist/');
}

// Inject manifest & high-res icons into dist/index.html
const indexPath = path.join(distPath, 'index.html');
if (fs.existsSync(indexPath)) {
  let html = fs.readFileSync(indexPath, 'utf-8');

  const pwaTags = `
    <!-- PWA Manifest & Android Theme -->
    <link rel="manifest" href="/manifest.json">
    <meta name="theme-color" content="#0A0D14">
    <meta name="mobile-web-app-capable" content="yes">

    <!-- iOS Apple Touch Icon & Fullscreen -->
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <meta name="apple-mobile-web-app-title" content="Settle">
    <link rel="apple-touch-icon" href="/icon-512.png">
    <link rel="icon" type="image/png" sizes="512x512" href="/icon-512.png">
    <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png">
  `;

  html = html.replace('</head>', `${pwaTags}</head>`);
  html = html.replace('<body', '<body style="background-color: #0A0D14;"');
  html = html.replace('html {', 'html { background-color: #0A0D14;');

  fs.writeFileSync(indexPath, html, 'utf-8');
  console.log('✅ Injected high-res PWA manifest and dark background into dist/index.html');
}
