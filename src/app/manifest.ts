import type { MetadataRoute } from 'next';

/**
 * Web App Manifest (served at /manifest.webmanifest).
 *
 * Next auto-injects `<link rel="manifest">` from this file convention, so the
 * root layout doesn't reference it manually. No request-time APIs are used, so
 * the route stays static and cacheable.
 *
 * Colors mirror the app's locked dark chrome (--background === #0a0a0a) since
 * the theme is dark-only (see ThemeProvider in app/layout.tsx). Icons are the
 * generated THULUTH 33/33/33/1 donut mark (scripts/generate-pwa-icons.mjs).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'THULUTH — Financial Operating System',
    short_name: 'THULUTH',
    description:
      'A personal financial operating system based on the 33/33/33/1 wealth methodology.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    display_override: ['standalone', 'minimal-ui'],
    orientation: 'portrait',
    lang: 'en',
    dir: 'ltr',
    background_color: '#0a0a0a',
    theme_color: '#0a0a0a',
    categories: ['finance', 'productivity'],
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
