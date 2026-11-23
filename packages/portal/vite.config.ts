// The portal's client build (K19): `src/main.ts` and the pages, with `@orthograph/portal-ui` and HeroUI Pro, into `dist/client`
// (index.html, JS, CSS). It runs once, here, where the licence is (`nx run portal:client`), and the built files are what ships:
// a project's Worker serves them as static assets and never builds them. HeroUI's and Pro's precompiled sheets come from portal-ui's
// own install, the only place that names the licensed package.
import { defineConfig } from "vite";
// A build tool's config reads a sibling project's script by its path: portal-ui exports no sheets, and the script is not part of its package.
// oxlint-disable-next-line @nx/enforce-module-boundaries
import { sheets } from "../portal-ui/tools/sheets.mjs";

export default defineConfig({
  root: import.meta.dirname,
  base: "/portal/",
  resolve: {
    dedupe: ["react", "react-dom"],
    alias: { "heroui-styles": sheets.base, "heroui-pro-styles": sheets.pro },
  },
  build: {
    outDir: "dist/client",
    emptyOutDir: true,
    sourcemap: false,
    chunkSizeWarningLimit: 4000,
    rolldownOptions: {
      // HeroUI's dependencies carry `"use client"`; a browser bundle has no server components to tell apart, so the directive is noise.
      onwarn: (warning, warn) => { if (warning.code !== "MODULE_LEVEL_DIRECTIVE") warn(warning); },
    },
  },
});
