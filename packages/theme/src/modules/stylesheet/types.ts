import type { Theme } from "../tokens/types.ts";

export type StylesheetApi = {
  /** The whole stylesheet for a theme, as text. A pure function of its values: nothing in it is written by hand but the shape. */
  readonly render: (theme: Theme) => string;
};
