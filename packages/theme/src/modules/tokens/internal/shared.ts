import type { TokenMap } from "../types.ts";
import { icons } from "./icons.ts";

// What does not change with the scheme. The font names are the old portal's (Plus Jakarta Sans for text, JetBrains Mono for names,
// ids and times); no font file ships with the theme, so a page that has not loaded them gets the system fallbacks.
// 15px at 1.5 is the old body text, and 0.5rem the old radius (HeroUI's `--radius`).
export const shared: TokenMap = {
  "--ui-radius": "0.5rem",
  "--ui-spacing": "0.25rem",
  "--ui-font-size": "0.9375rem",
  "--ui-line-height": "1.5",
  "--ui-font-sans": '"Plus Jakarta Sans", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  "--ui-font-mono": '"JetBrains Mono", ui-monospace, "SF Mono", Menlo, Consolas, monospace',
  ...icons,
};
