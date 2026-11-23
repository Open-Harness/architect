// The theme's values as data: what the stylesheet is rendered from, and what a program reads (`tokens.dark["--ui-background"]`).

/** The two looks. The stylesheet follows the system's, and `data-theme` on `<html>` overrides it. */
export type Scheme = "light" | "dark";

/** Custom property name (`"--ui-background"`) to the value the browser computes for it. */
export type TokenMap = Readonly<Record<string, string>>;

/** Every `--ui-*` token UI SDK's `web.css` declares on `:root`, once per scheme. A token that does not change with the scheme has the same string in both. */
export type Tokens = Readonly<Record<Scheme, TokenMap>>;

export type Theme = {
  readonly tokens: Tokens;
  /** The type scale and spacing, as `--theme-*` custom properties. Same in both schemes. */
  readonly scale: TokenMap;
};
