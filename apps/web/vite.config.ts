import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// #type preload the hashed Inter woff2 emitted from base.css (build only; name unknown until bundling)
const preloadInter = (): Plugin => ({
  name: 'preload-inter',
  apply: 'build',
  transformIndexHtml: (_html, ctx) => {
    const font = Object.keys(ctx.bundle ?? {}).find((f) => /inter-latin-wght.*\.woff2$/.test(f));
    return font
      ? [
          {
            tag: 'link',
            attrs: { rel: 'preload', href: `/${font}`, as: 'font', type: 'font/woff2', crossorigin: '' },
            injectTo: 'head-prepend',
          },
        ]
      : [];
  },
});

// #deploy `dist/_headers` (Workers static assets): security headers + CSP with sha256 of each inline
// script (vite-plugin-pwa's inline SW registration) — written after every other plugin touched index.html.
const securityHeaders = (): Plugin => ({
  name: 'security-headers',
  apply: 'build',
  enforce: 'post',
  closeBundle() {
    const html = readFileSync('dist/index.html', 'utf8');
    const hashes = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map(
      (m) =>
        `'sha256-${createHash('sha256')
          .update(m[1] ?? '')
          .digest('base64')}'`,
    );
    const csp = [
      "default-src 'self'",
      `script-src 'self' ${hashes.join(' ')}`.trim(),
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data:",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "base-uri 'none'",
      "form-action 'self'",
    ].join('; ');
    // Referrer-Policy must keep same-origin Referer: login derives `next` from it.
    const headers = `/*
  Strict-Transport-Security: max-age=31536000
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  X-Frame-Options: DENY
  Content-Security-Policy: ${csp}
/assets/*
  Cache-Control: public, max-age=31536000, immutable
`;
    writeFileSync('dist/_headers', headers);
    console.log(`security-headers: ${hashes.length} inline script hash(es)`);
  },
});

// #perf stable chunk names so `.size-limit.js` can classify them:
// entry-* (initial) · route-* · editor-* · celebrate-* · vendor-motion-* · chunk-* (shared)
// A shared chunk (no facade) whose modules all live in celebrate/ still counts as celebrate-*.
const group = (c: { facadeModuleId: string | null; moduleIds: string[] }) => {
  const dir = (id: string) => id.match(/\/src\/(routes|editor|celebrate)\//)?.[1];
  const m = c.facadeModuleId
    ? dir(c.facadeModuleId)
    : c.moduleIds.every((i) => dir(i) === 'celebrate') && 'celebrate';
  return m ? (m === 'routes' ? 'route' : m) : 'chunk';
};

// #pwa precache = app shell only: entry + its static imports + their CSS (from Vite's manifest, same
// walk as `.size-limit.js`), index.html, icons, webmanifest. Everything else in /assets is hashed →
// runtime CacheFirst (lazy chunks, Inter).
const shellOnly = <E extends { url: string }>(entries: E[]) => {
  const vm = JSON.parse(readFileSync('dist/.vite/manifest.json', 'utf8')) as Record<
    string,
    { file: string; css?: string[]; imports?: string[]; isEntry?: boolean }
  >;
  const keep = new Set<string>();
  const walk = (k: string) => {
    const c = vm[k];
    if (!c || keep.has(c.file)) return;
    keep.add(c.file);
    for (const f of c.css ?? []) keep.add(f);
    for (const i of c.imports ?? []) walk(i);
  };
  for (const [k, c] of Object.entries(vm)) if (c.isEntry) walk(k);
  const manifest = entries.filter((e) => !e.url.startsWith('assets/') || keep.has(e.url));
  return Promise.resolve({ manifest, warnings: [] });
};

const pwa = VitePWA({
  strategies: 'generateSW',
  registerType: 'autoUpdate',
  injectRegister: 'inline',
  manifest: {
    id: '/',
    name: 'Motion',
    short_name: 'Motion',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    theme_color: '#ffffff',
    background_color: '#ffffff',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  },
  workbox: {
    globPatterns: ['**/*.{js,css,html,png}'],
    manifestTransforms: [shellOnly],
    navigateFallback: 'index.html',
    // worker-owned paths (REST, MCP, OAuth + SSR login/consent) must never get the SPA shell
    navigateFallbackDenylist: [/^\/(api|mcp|oauth|authorize|token|\.well-known)(\/|$)/],
    cleanupOutdatedCaches: true,
    // control the first visit too, so /api is cached before the first reload (offline right after install)
    clientsClaim: true,
    runtimeCaching: [
      {
        urlPattern: ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith('/assets/'),
        handler: 'CacheFirst',
        options: {
          cacheName: 'assets',
          expiration: { maxEntries: 60 },
          cacheableResponse: { statuses: [200] },
        },
      },
      {
        urlPattern: ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith('/api/'),
        method: 'GET',
        handler: 'NetworkFirst',
        options: {
          cacheName: 'api',
          networkTimeoutSeconds: 3,
          expiration: { maxEntries: 100 },
          cacheableResponse: { statuses: [200] },
        },
      },
    ],
  },
});

export default defineConfig({
  plugins: [react(), preloadInter(), pwa, securityHeaders()],
  server: { proxy: { '^/(api|mcp|oauth|authorize|token|\\.well-known)(/|$)': 'http://localhost:8787' } },
  build: {
    target: 'es2022',
    manifest: true,
    // #perf JS deps of lazy chunks load on demand (idle prefetch warms them); only CSS stays in the
    // preload lists so code-split CSS still arrives with its chunk. Cuts per-import dep arrays from entry.
    modulePreload: { resolveDependencies: (_f, deps) => deps.filter((d) => d.endsWith('.css')) },
    rollupOptions: {
      output: {
        entryFileNames: 'assets/entry-[hash].js',
        chunkFileNames: (c) =>
          c.name.startsWith('vendor-') ? 'assets/[name]-[hash].js' : `assets/${group(c)}-[name]-[hash].js`,
        assetFileNames: 'assets/[name]-[hash][extname]',
        // only motion's own packages — never its deps (react), which must stay in entry
        codeSplitting: {
          groups: [
            {
              name: 'vendor-motion',
              test: /node_modules\/(motion|framer-motion|motion-dom|motion-utils)\//,
              includeDependenciesRecursively: false,
            },
          ],
        },
      },
    },
  },
});
