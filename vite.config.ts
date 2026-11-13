import { createHash } from 'node:crypto';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

const BASE = '/space-apps-2026/';

// Writes a small service worker that caches every built file, so the demo runs with no network.
function offline(): Plugin {
  return {
    name: 'offline-service-worker',
    apply: 'build',
    generateBundle(_, bundle) {
      const files = ['', 'icon.svg', 'icon-180.png', 'icon-192.png', 'icon-512.png', 'manifest.webmanifest', 'agents.md', ...Object.keys(bundle)].map((f) => BASE + f);
      const version = createHash('sha256').update(files.join('|')).digest('hex').slice(0, 12);
      const source = `// Generated at build time. Caches the whole app for offline use.
const CACHE = 'crew-health-${version}';
const FILES = ${JSON.stringify(files)};
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;
  const key = e.request.mode === 'navigate' ? '${BASE}' : e.request;
  e.respondWith(caches.match(key, { ignoreSearch: true }).then((hit) => hit || fetch(e.request)));
});
`;
      this.emitFile({ type: 'asset', fileName: 'sw.js', source });
    },
  };
}

// Static app, served from GitHub Pages under /space-apps-2026/.
export default defineConfig({
  base: BASE,
  plugins: [react(), offline()],
});
