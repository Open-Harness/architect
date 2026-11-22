// The theme's values: both schemes declare the same tokens, the schemes differ where a look must, and every value is one line.
import { describe, expect, it } from "vitest";
import { theme } from "./service.ts";

describe("theme.tokens", () => {
  it("declares the same 29 tokens in both schemes, every one a --ui-* name", () => {
    const light = Object.keys(theme.tokens.light).sort();
    expect(light).toHaveLength(29);
    expect(Object.keys(theme.tokens.dark).sort()).toEqual(light);
    expect(light.every((name) => name.startsWith("--ui-"))).toBe(true);
  });

  it("differs between the schemes at the surface and the text", () => {
    for (const name of ["--ui-background", "--ui-foreground", "--ui-muted-foreground", "--ui-border"]) {
      expect(theme.tokens.dark[name], name).not.toBe(theme.tokens.light[name]);
    }
  });

  it("names the fonts the portal always had, with system fallbacks, and no light-dark()", () => {
    expect(theme.tokens.dark["--ui-font-sans"]).toMatch(/^"Plus Jakarta Sans", .*sans-serif$/);
    expect(theme.tokens.dark["--ui-font-mono"]).toMatch(/^"JetBrains Mono", .*monospace$/);
    for (const scheme of [theme.tokens.light, theme.tokens.dark]) {
      for (const value of Object.values(scheme)) expect(value).not.toContain("light-dark(");
    }
  });

  it("writes every value on one line, trimmed, so the browser computes the string that was written", () => {
    for (const value of [...Object.values(theme.tokens.light), ...Object.values(theme.tokens.dark), ...Object.values(theme.scale)]) {
      expect(value).toBe(value.trim());
      expect(value).not.toContain("\n");
    }
  });
});

describe("theme.scale", () => {
  it("is --theme-* names only, which the --ui-* tokens never collide with", () => {
    const names = Object.keys(theme.scale);
    expect(names.every((name) => name.startsWith("--theme-"))).toBe(true);
    expect(names).toEqual(expect.arrayContaining(["--theme-text-base", "--theme-space-4", "--theme-weight-semibold"]));
  });

  it("builds every spacing step from the --ui-spacing unit", () => {
    for (const [name, value] of Object.entries(theme.scale)) {
      if (name.startsWith("--theme-space-")) expect(value).toMatch(/^calc\(var\(--ui-spacing\) \* \d+\)$/);
    }
  });
});
