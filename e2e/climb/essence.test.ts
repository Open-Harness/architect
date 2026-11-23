// Property 5 compares `essence` of two runs. These tests pin what it takes out (timings) and what it must keep (verdicts).
import { describe, expect, it } from "vitest";
import { essence, type Proved } from "./support.ts";

const of = (...lines: string[]) => essence({ lines } as unknown as Proved);

describe("essence", () => {
  it("is the same with and without the load-dependent review note", () => {
    const calm = "allowance.grant performance ✔ p50 4ms p95 9ms budget p95 50ms";
    const loaded = "allowance.grant performance ✔ p50 40ms p95 90ms budget p95 50ms; review: p95 90ms is over 1.5x budget";
    expect(of(loaded)).toEqual(of(calm));
  });

  it("still tells a changed verdict apart, with or without the note", () => {
    const pass = "allowance.grant performance ✔ p50 4ms p95 9ms budget p95 50ms";
    const fail = "allowance.grant performance ✘ p50 4ms p95 9ms budget p95 50ms";
    expect(of(fail)).not.toEqual(of(pass));
    expect(of(`${fail}; review: p95 90ms is over 1.5x budget`)).not.toEqual(of(pass));
  });
});
