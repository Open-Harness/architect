import type { TokenMap } from "../types.ts";

// The type scale and spacing, from the sizes the old portal's stylesheet used (0.8, 0.85, 15px, 1.1 and 1.5rem), rounded onto one ladder.
// Spacing is a multiple of `--ui-spacing`, so changing the unit moves every step and every UI SDK part with it.
const steps = [1, 2, 3, 4, 6, 8, 12, 16] as const;

export const scale: TokenMap = {
  "--theme-text-xs": "0.75rem",
  "--theme-text-sm": "0.85rem",
  "--theme-text-base": "0.9375rem",
  "--theme-text-lg": "1.1rem",
  "--theme-text-xl": "1.5rem",
  "--theme-text-2xl": "2rem",
  "--theme-leading-tight": "1.25",
  "--theme-leading-normal": "1.5",
  "--theme-weight-regular": "400",
  "--theme-weight-medium": "500",
  "--theme-weight-semibold": "600",
  ...Object.fromEntries(steps.map((n) => [`--theme-space-${String(n)}`, `calc(var(--ui-spacing) * ${String(n)})`])),
};
