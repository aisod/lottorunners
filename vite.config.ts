// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
//
// PWA + TanStack Start: `vite-plugin-pwa` resolves `virtual:pwa-register` and emits the web
// manifest from the root plugin list, but its Workbox `closeBundle` step reads a shared ctx
// that ends up on the SSR resolve pass, so `generateSW` is skipped (vite-pwa#902). A
// client-only hook runs the same Workbox `generateSW` against the real client outDir
// (`dist/client` from TanStack's environment plan) after the client Rollup bundle closes.
import { resolve } from "node:path";
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { perEnvironmentPlugin } from "vite";
import type { GenerateSWOptions } from "workbox-build";
import { VitePWA } from "vite-plugin-pwa";

const CLIENT = "client";

/** Single Workbox config for both vite-plugin-pwa and the client-only `generateSW` emit. */
const lottoRunnersWorkbox: Partial<GenerateSWOptions> = {
  navigateFallback: "/offline.html",
  navigateFallbackDenylist: [/^\/api\//, /^\/sw\.js$/, /^\/manifest\.webmanifest$/],
  globPatterns: ["**/*.{js,css,html,ico,png,svg,webp,woff2,webmanifest}"],
  maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
  skipWaiting: true,
  clientsClaim: true,
  additionalManifestEntries: [
    { url: "/offline.html", revision: "offline-v1" },
    { url: "/manifest.webmanifest", revision: "manifest-v1" },
    { url: "/customer/welcome", revision: "auth-flow-v2" },
    { url: "/customer/onboarding-login", revision: "auth-flow-v2" },
  ],
  runtimeCaching: [
    {
      urlPattern: /\/assets\/.*\.(?:js|css|woff2)$/i,
      handler: "CacheFirst",
      options: {
        cacheName: "static-assets",
        expiration: {
          maxEntries: 200,
          maxAgeSeconds: 60 * 60 * 24 * 30,
        },
      },
    },
    {
      urlPattern: ({ url }) =>
        url.hostname.includes("supabase.co") || url.hostname.includes("supabase.in"),
      handler: "NetworkFirst",
      options: {
        cacheName: "supabase-api",
        networkTimeoutSeconds: 10,
        expiration: {
          maxEntries: 80,
          maxAgeSeconds: 60 * 60 * 6,
        },
      },
    },
    {
      urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "google-fonts-stylesheets",
      },
    },
    {
      urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
      handler: "CacheFirst",
      options: {
        cacheName: "google-fonts-webfonts",
        expiration: {
          maxEntries: 20,
          maxAgeSeconds: 60 * 60 * 24 * 365,
        },
      },
    },
    {
      urlPattern: ({ url }) =>
        url.hostname.includes("tile.openstreetmap.org") ||
        url.hostname.includes("basemaps.cartocdn.com") ||
        url.hostname.includes("a.tile.openstreetmap.org") ||
        url.hostname.includes("b.tile.openstreetmap.org") ||
        url.hostname.includes("c.tile.openstreetmap.org"),
      handler: "CacheFirst",
      options: {
        cacheName: "map-tiles",
        expiration: {
          maxEntries: 400,
          maxAgeSeconds: 60 * 60 * 24 * 14,
        },
      },
    },
    {
      urlPattern: /^https:\/\/nominatim\.openstreetmap\.org\/.*/i,
      handler: "NetworkFirst",
      options: {
        cacheName: "nominatim",
        networkTimeoutSeconds: 8,
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 60 * 60 * 24,
        },
      },
    },
  ],
};

function tanstackClientWorkboxEmitPlugin(workbox: Partial<GenerateSWOptions>) {
  return perEnvironmentPlugin("tanstack-start-pwa-workbox-emit", (environment) => {
    if (environment.name !== CLIENT) return false;
    return {
      name: "tanstack-start-pwa-workbox-emit:closeBundle",
      closeBundle: {
        sequential: true,
        order: "post",
        async handler() {
          const env = this.environment;
          if (!env || env.name !== CLIENT) return;
          const { root } = env.config;
          const outDir = env.config.build.outDir;
          const { generateSW } = await import("workbox-build");
          await generateSW({
            swDest: resolve(root, outDir, "sw.js"),
            globDirectory: resolve(root, outDir),
            mode: "development",
            cleanupOutdatedCaches: true,
            dontCacheBustURLsMatching: /^assets\//,
            ...workbox,
          });
        },
      },
    };
  });
}

export default defineConfig({
  plugins: [
    VitePWA({
      mode: "development",
      injectRegister: null,
      registerType: "autoUpdate",
      includeAssets: ["icon-192.png", "icon-512.png", "apple-touch-icon.png"],
      manifest: {
        name: "Lotto Runners",
        short_name: "Lotto Runners",
        description:
          "Errands, rides, deliveries & trucks on demand. Live map and real-time tracking.",
        theme_color: "#005d98",
        background_color: "#f9f9ff",
        display: "standalone",
        display_override: ["standalone", "browser"],
        orientation: "portrait-primary",
        start_url: "/",
        scope: "/",
        categories: ["travel", "business", "utilities"],
        icons: [
          {
            src: "/icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: { ...lottoRunnersWorkbox },
      devOptions: {
        enabled: false,
      },
    }),
    tanstackClientWorkboxEmitPlugin(lottoRunnersWorkbox),
  ],
  vite: {
    server: {
      // Listen on all interfaces so phones on the same Wi‑Fi can open http://<laptop-ip>:8080
      host: true,
      port: 8080,
      strictPort: true,
    },
  },
});
