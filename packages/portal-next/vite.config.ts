// The new client's build (K19): `src/main.ts` and the pages, on UI SDK, the theme and the shell, into `dist/client` (index.html, JS, CSS).
// The built files are what ships: a project's Worker serves them as static assets under `/portal`. No licence, no token.
import { defineConfig } from "vite";

export default defineConfig({
  root: import.meta.dirname,
  base: "/portal/",
  resolve: { dedupe: ["react", "react-dom"] },
  build: {
    outDir: "dist/client",
    emptyOutDir: true,
    sourcemap: false,
    chunkSizeWarningLimit: 4000,
    rolldownOptions: {
      // UI SDK's parts carry `"use client"`; a browser bundle has no server components to tell apart, so the directive is noise.
      onwarn: (warning, warn) => { if (warning.code !== "MODULE_LEVEL_DIRECTIVE") warn(warning); },
    },
  },
});
