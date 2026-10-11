// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { VitePWA } from "vite-plugin-pwa";
import { mcpPlugin } from "@lovable.dev/mcp-js/stacks/tanstack/vite";

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    plugins: [
      mcpPlugin(),
      VitePWA({
        registerType: "autoUpdate",
        // CRITICAL: never enable in dev — would break the Lovable preview iframe
        devOptions: { enabled: false },
        injectRegister: null, // we register manually in pwa-manager.tsx with iframe/preview guards
        manifest: false, // we already ship /public/manifest.json
        workbox: {
          cacheId: "krishibondhu-v1",
          navigateFallback: "/offline",
          navigateFallbackDenylist: [/^\/~oauth/, /^\/api\//],
          globPatterns: ["**/*.{js,css,html,svg,png,ico,webp,woff,woff2}"],
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: true,
          runtimeCaching: [
            {
              // Supabase API — always try fresh, fall back to cache
              urlPattern: ({ url }) => /\.supabase\.co$/.test(url.hostname),
              handler: "NetworkFirst",
              options: {
                cacheName: "krishibondhu-supabase",
                networkTimeoutSeconds: 5,
                expiration: {
                  maxEntries: 200,
                  maxAgeSeconds: 24 * 60 * 60, // 24h
                },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              // Images — fast, 7 days
              urlPattern: ({ request }) => request.destination === "image",
              handler: "CacheFirst",
              options: {
                cacheName: "krishibondhu-images",
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 7 * 24 * 60 * 60, // 7d
                },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              // HTML navigations — NetworkFirst (NOT SWR; SWR on HTML locks users
              // to a stale shell that future deploys can't dislodge)
              urlPattern: ({ request }) => request.mode === "navigate",
              handler: "NetworkFirst",
              options: {
                cacheName: "krishibondhu-pages",
                networkTimeoutSeconds: 3,
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 24 * 60 * 60,
                },
              },
            },
            {
              // Same-origin static assets (JS/CSS chunks) — StaleWhileRevalidate
              urlPattern: ({ url, sameOrigin }) =>
                sameOrigin && /\.(?:js|css|woff2?)$/.test(url.pathname),
              handler: "StaleWhileRevalidate",
              options: {
                cacheName: "krishibondhu-assets",
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 7 * 24 * 60 * 60,
                },
              },
            },
          ],
        },
      }),
    ],
  },
});
