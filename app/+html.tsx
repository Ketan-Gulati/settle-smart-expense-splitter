import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover" />
        <title>Settle</title>

        {/* PWA Manifest & Android Theme */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0A0D14" />
        <meta name="mobile-web-app-capable" content="yes" />

        {/* iOS Web App Capable & Icons */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Settle" />
        <link rel="apple-touch-icon" href="/icon-512.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/icon-512.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png" />

        {/* Disable body scrolling & style reset */}
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: `
          html, body {
            background-color: #0A0D14 !important;
            height: 100%;
            overflow: hidden;
            -webkit-tap-highlight-color: transparent;
          }
          #root {
            display: flex;
            height: 100%;
            flex: 1;
            background-color: #0A0D14;
          }
        `}} />
      </head>
      <body style={{ backgroundColor: '#0A0D14' }}>{children}</body>
    </html>
  );
}
