import type { ContrastApi } from "./types.ts";
import { luminance } from "./internal/oklch.ts";

const ratio = (a: string, b: string): number | undefined => {
  const x = luminance(a);
  const y = luminance(b);
  return x === undefined || y === undefined ? undefined : (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};

export const Contrast: ContrastApi = { ratio };
