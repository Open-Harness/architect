import type { TokenMap } from "../types.ts";

// Derived from the old portal's light values (HeroUI's default light theme, 3.2.7), moved where contrast needed it:
// muted-foreground is darker than HeroUI's muted (4.97:1 on the muted fill, not 4.0), primary is darker than HeroUI's accent
// (white text on 0.6204 is 3.9:1), and destructive is darker than HeroUI's danger (3.6:1 as text).
export const light: TokenMap = {
  "--ui-background": "oklch(0.9702 0 0)",
  "--ui-foreground": "oklch(0.2103 0.0059 285.89)",
  "--ui-muted": "oklch(0.9373 0.0013 286.37)",
  "--ui-muted-foreground": "oklch(0.5017 0.0138 285.94)",
  "--ui-border": "oklch(0.9 0.004 286.32)",
  "--ui-input": "oklch(0.6 0.006 286.32)",
  "--ui-primary": "oklch(0.55 0.2 254)",
  "--ui-primary-foreground": "oklch(0.9911 0 0)",
  "--ui-destructive": "oklch(0.55 0.2328 25.74)",
  "--ui-ring": "oklch(0.55 0.2 254)",
  "--ui-ring-border": "oklch(0.55 0.2 254)",
  "--ui-overlay": "rgba(0, 0, 0, 0.5)",
  "--ui-shadow": "0 2px 8px 0 rgba(0, 0, 0, 0.06), 0 -6px 12px 0 rgba(0, 0, 0, 0.03), 0 14px 28px 0 rgba(0, 0, 0, 0.08)",
};
