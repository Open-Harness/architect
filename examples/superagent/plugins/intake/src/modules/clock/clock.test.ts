import { describe, expect, it } from "vitest";
import { activeClock } from "./service.ts";

describe("the active clock", () => {
  it("is the wall clock less the time spent paused", () => {
    expect(activeClock({ state: "live", pausedAt: undefined, pausedFor: 0n }, 10_000n)).toBe(10_000n);
    expect(activeClock({ state: "live", pausedAt: 1_000n, pausedFor: 4_000n }, 10_000n)).toBe(6_000n);
  });

  it("stands still while the superagent is paused, at the moment the pause began", () => {
    const paused = { state: "paused", pausedAt: 8_000n, pausedFor: 1_000n } as const;
    expect(activeClock(paused, 8_000n)).toBe(7_000n);
    expect(activeClock(paused, 50_000n)).toBe(7_000n);
  });
});
