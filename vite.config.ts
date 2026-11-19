/// <reference types="vitest/config" />

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// Node 25 以降の実験的な localStorage を無効にして、テスト時の ExperimentalWarning を出さないようにする。
// このフラグを知らない古い Node ではエラーになるため、使えるときだけ付ける。
const testExecArgv = process.allowedNodeEnvironmentFlags.has(
  "--no-experimental-webstorage",
)
  ? ["--no-experimental-webstorage"]
  : [];

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icons/icon.svg", "icons/apple-touch-icon.png"],
      manifest: {
        name: "おみくじ",
        short_name: "おみくじ",
        description: "毎日の運勢を占うおみくじアプリ",
        lang: "ja",
        start_url: "/",
        display: "standalone",
        orientation: "portrait",
        background_color: "#fff8ec",
        theme_color: "#b3261e",
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png}"],
      },
    }),
  ],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    execArgv: testExecArgv,
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/**/*.test.{ts,tsx}", "src/test/**", "src/main.tsx"],
    },
  },
});
