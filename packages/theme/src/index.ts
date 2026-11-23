// @orthograph/theme: the look every Orthograph screen shares. `./theme.css` is the stylesheet; this entry holds the same values as data.
import { Stylesheet } from "./modules/stylesheet/service.ts";
import { theme } from "./modules/tokens/service.ts";

/** Every `--ui-*` token, once per scheme: `tokens.dark["--ui-background"]`. */
export const tokens = theme.tokens;
/** The type scale and spacing (`--theme-*`), the same in both schemes. */
export const scale = theme.scale;
/** The stylesheet's text: what `theme.css` holds. */
export const css: string = Stylesheet.render(theme);

export type { Scheme, Theme, TokenMap, Tokens } from "./modules/tokens/types.ts";
