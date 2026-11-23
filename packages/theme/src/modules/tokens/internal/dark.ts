import type { TokenMap } from "../types.ts";

// The old portal's dark values (HeroUI's default dark theme, 3.2.7): its background, foreground, muted text and border as they are.
// Moved where contrast needed it: primary is darker than HeroUI's accent (white text on 0.6204 is 3.9:1), the ring keeps HeroUI's
// accent (5.5:1 on the background), and destructive is lighter than HeroUI's danger so it reads as text (6.4:1).
export const dark: TokenMap = {
  "--ui-background": "oklch(0.12 0.005 285.823)",
  "--ui-foreground": "oklch(0.9911 0 0)",
  "--ui-muted": "oklch(0.257 0.0037 286.14)",
  "--ui-muted-foreground": "oklch(0.705 0.015 286.067)",
  "--ui-border": "oklch(0.28 0.006 286.033)",
  "--ui-input": "oklch(0.52 0.006 286.033)",
  "--ui-primary": "oklch(0.55 0.2 254)",
  "--ui-primary-foreground": "oklch(0.9911 0 0)",
  "--ui-destructive": "oklch(0.68 0.1967 24.63)",
  "--ui-ring": "oklch(0.62 0.195 253.83)",
  "--ui-ring-border": "oklch(0.62 0.195 253.83)",
  "--ui-overlay": "rgba(0, 0, 0, 0.6)",
  "--ui-shadow": "0 0 1px 0 rgba(255, 255, 255, 0.3) inset, 0 8px 24px -8px rgba(0, 0, 0, 0.6)",
};
