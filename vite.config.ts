import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
// Module 4: offline packaging
import { VitePWA } from "vite-plugin-pwa";

// FastAPI serves the SPA and /api/* over local HTTPS on the same origin.
// In development, Vite proxies /api (including WebSocket / WebRTC signaling) to it.
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // Module 4: offline packaging. API responses (including health data) are never cached.
    VitePWA({
      registerType: "prompt",
      injectRegister: false,
      includeAssets: ["favicon.svg", "orbit-icon.svg"],
      manifest: {
        name: "ORBIT | Crew Health",
        short_name: "ORBIT",
        display: "standalone",
        background_color: "#0A0F17",
        theme_color: "#0A0F17",
        start_url: "./evidence",
        scope: "./",
        icons: [
          {
            src: "orbit-icon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff,woff2,csv}"],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        navigateFallback: "index.html",
        navigateFallbackDenylist: [/^\/api(?:\/|$)/, /^\/models\//],
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          { urlPattern: /\/api(?:\/|$)/, handler: "NetworkOnly" },
          {
            urlPattern: ({ url, sameOrigin }) =>
              sameOrigin && url.pathname.startsWith("/models/"),
            handler: "CacheFirst",
            options: {
              cacheName: "orbit-models-v1",
              expiration: { maxEntries: 64 },
              cacheableResponse: { statuses: [200] },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      // Never used (ORBIT supplies a local media manager); keeps Daily's CDN loader out of the bundle.
      "@daily-co/daily-js": fileURLToPath(
        new URL("./src/vendor/daily-js-stub.ts", import.meta.url),
      ),
    },
  },
  server: {
    proxy: {
      "/api": {
        target: "https://localhost:8443",
        secure: false,
        changeOrigin: true,
        ws: true,
      },
    },
  },
  build: {
    sourcemap: true,
    chunkSizeWarningLimit: 900,
  },
});
