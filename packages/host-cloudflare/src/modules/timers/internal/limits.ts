// The world's two real-time bounds (M8.07), read from its environment.

/** A timer's delay is a signed 32-bit number of milliseconds: a longer one would fire at once, so no limit is longer than this. */
export const MAX_DELAY_MS = 2 ** 31 - 2;

/** A limit: a whole number greater than nought, no longer than a timer can wait; anything else (a fraction, a huge number, text) is the default. */
export const limitOf = (text: string | undefined, fallback: number): number => {
  const n = Number(text);
  return text !== undefined && Number.isInteger(n) && n > 0 ? Math.min(n, MAX_DELAY_MS) : fallback;
};
