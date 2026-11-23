import type { Theme } from "../tokens/types.ts";
import type { StylesheetApi } from "./types.ts";
import { base } from "./internal/base.ts";
import { declare, differing } from "./internal/declarations.ts";

const HEADER = "/* Generated from packages/theme/src/modules/tokens (the tokens and the scale). Do not edit. */";

/**
 * Light is the base. Dark says again only what differs, inside `prefers-color-scheme: dark`; and `data-theme` on `<html>` says each
 * scheme in full for itself, one attribute selector heavier than the media rule, so it wins both ways.
 */
const render = ({ tokens, scale }: Theme): string => {
  const darkOnly = differing(tokens.dark, tokens.light);
  const lightAgain = differing(tokens.light, tokens.dark);
  return [
    HEADER,
    `:root {\n  color-scheme: light;\n${declare(tokens.light, 1)}\n${declare(scale, 1)}\n}`,
    `@media (prefers-color-scheme: dark) {\n  :root {\n    color-scheme: dark;\n${declare(darkOnly, 2)}\n  }\n}`,
    `:root[data-theme="light"] {\n  color-scheme: light;\n${declare(lightAgain, 1)}\n}`,
    `:root[data-theme="dark"] {\n  color-scheme: dark;\n${declare(darkOnly, 1)}\n}`,
    base,
  ].join("\n\n") + "\n";
};

export const Stylesheet: StylesheetApi = { render };
