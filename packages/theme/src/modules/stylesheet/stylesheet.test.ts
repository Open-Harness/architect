// The stylesheet and the tokens must not drift: read the rendered CSS back, apply it the way the browser's cascade would for each way a scheme
// is chosen, and hold the result equal to `tokens`. (The check in e2e/portal-next does the same in Chromium; this is its fast twin.)
import { describe, expect, it } from "vitest";
import { theme } from "../tokens/service.ts";
import type { TokenMap } from "../tokens/types.ts";
import { Stylesheet } from "./service.ts";

const css = Stylesheet.render(theme);

const declarations = (body: string): TokenMap =>
  Object.fromEntries([...body.matchAll(/^\s*(--[a-z0-9-]+):\s*(.*);$/gm)].map((m) => [m[1] ?? "", m[2] ?? ""]));

/** The four rules, in the order they are written: the base, dark by media, light by attribute, dark by attribute. */
const rules = [...css.replace(/\/\*[\s\S]*?\*\//g, "").matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => ({ selector: (m[1] ?? "").trim(), decls: declarations(m[2] ?? "") }));
const [base, byMedia, lightByAttribute, darkByAttribute] = rules.map((r) => r.decls);

describe("Stylesheet.render", () => {
  it("opens with the generated-file line", () => {
    expect(css.startsWith("/* Generated from ")).toBe(true);
    expect(css.split("\n")[0]).toContain("Do not edit.");
  });

  it("has the four rules, with the attribute rules heavier than the media rule", () => {
    expect(rules.map((r) => r.selector)).toEqual([":root", ":root", ':root[data-theme="light"]', ':root[data-theme="dark"]', "body", "code, kbd, samp, pre"]);
  });

  it("resolves to tokens.light with no preference or with data-theme=light, and to tokens.dark under the media query or data-theme=dark", () => {
    const withScale = (scheme: TokenMap): TokenMap => ({ ...scheme, ...theme.scale });
    expect({ ...base }).toEqual(withScale(theme.tokens.light));
    expect({ ...base, ...byMedia }).toEqual(withScale(theme.tokens.dark));
    expect({ ...base, ...byMedia, ...lightByAttribute }).toEqual(withScale(theme.tokens.light));
    expect({ ...base, ...darkByAttribute }).toEqual(withScale(theme.tokens.dark));
  });

  it("writes each scheme's own value for every token that differs, and never light-dark()", () => {
    expect(css).not.toContain("light-dark(");
    expect(Object.keys(darkByAttribute ?? {})).toEqual(Object.keys(byMedia ?? {}));
  });

  it("names neither UI SDK nor its stylesheet", () => {
    expect(css).not.toMatch(/@ui-sdk|web\.css/i);
  });
});
