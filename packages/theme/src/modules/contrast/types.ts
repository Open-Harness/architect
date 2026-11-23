export type ContrastApi = {
  /** WCAG contrast ratio (1 to 21) between two CSS colors written as `oklch(L C H)` or `oklch(L C H / a)`; opaque only. `undefined` for anything else. */
  readonly ratio: (a: string, b: string) => number | undefined;
};

/** A pair `styles.md` says to check: `of` drawn on `on`, and the least ratio it needs (4.5 for text, 3 for edges and rings). */
export type Pair = { readonly of: string; readonly on: string; readonly least: number };
