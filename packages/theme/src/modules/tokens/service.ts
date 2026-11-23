import type { Theme } from "./types.ts";
import { dark } from "./internal/dark.ts";
import { light } from "./internal/light.ts";
import { scale } from "./internal/scale.ts";
import { shared } from "./internal/shared.ts";

/** The theme's values: every token in both schemes, and the scale. The one place a value is written. */
export const theme: Theme = {
  tokens: { light: { ...shared, ...light }, dark: { ...shared, ...dark } },
  scale,
};
