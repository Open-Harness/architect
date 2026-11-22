// The pairs UI SDK's styles.md says to check when tokens are set (4.5:1 for text, 3:1 for control edges, focus indicators and state fills),
// in both schemes, plus the status color the portal reads as text.
import { describe, expect, it } from "vitest";
import { theme } from "../tokens/service.ts";
import { Contrast } from "./service.ts";
import type { Pair } from "./types.ts";

const pairs: readonly Pair[] = [
  { of: "--ui-foreground", on: "--ui-background", least: 4.5 },
  { of: "--ui-muted-foreground", on: "--ui-background", least: 4.5 },
  { of: "--ui-muted-foreground", on: "--ui-muted", least: 4.5 },
  { of: "--ui-primary-foreground", on: "--ui-primary", least: 4.5 },
  { of: "--ui-destructive", on: "--ui-background", least: 4.5 },
  { of: "--ui-input", on: "--ui-background", least: 3 },
  { of: "--ui-ring", on: "--ui-background", least: 3 },
  { of: "--ui-ring-border", on: "--ui-background", least: 3 },
];

describe("Contrast.ratio", () => {
  it("is 21 for black on white and 1 for a color on itself", () => {
    expect(Contrast.ratio("oklch(0 0 0)", "oklch(1 0 0)")).toBeCloseTo(21, 5);
    expect(Contrast.ratio("oklch(0.5 0.1 200)", "oklch(0.5 0.1 200)")).toBeCloseTo(1, 5);
  });

  it("gives nothing for a color it cannot read", () => {
    expect(Contrast.ratio("rgba(0, 0, 0, 0.5)", "oklch(1 0 0)")).toBeUndefined();
  });
});

describe("the theme's contrast pairs", () => {
  for (const scheme of ["light", "dark"] as const) {
    for (const pair of pairs) {
      it(`${scheme}: ${pair.of} on ${pair.on} is at least ${String(pair.least)}:1`, () => {
        const got = Contrast.ratio(theme.tokens[scheme][pair.of] ?? "", theme.tokens[scheme][pair.on] ?? "");
        expect(got, `${pair.of} or ${pair.on} is not an oklch() color`).toBeDefined();
        expect(got ?? 0).toBeGreaterThanOrEqual(pair.least);
      });
    }
  }
});
