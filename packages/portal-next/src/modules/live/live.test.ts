import { describe, expect, it } from "vitest";
import type { PortalData } from "../data/types.ts";
import { Live } from "./service.ts";

const counts = (calls: number, answered: number, refused: number, defects: number) => ({ calls, answered, refused, defects, refusals: {}, doorRefusals: 0 });
const call = (trace: string, operation: string) => ({ trace, operation });

const dataWith = (telemetry: unknown): PortalData => ({ blueprint: {}, snapshot: { telemetry } }) as unknown as PortalData;
const live = dataWith({
  environment: "staging",
  windowMs: 1_800_000,
  metrics: { state: "available", value: { operations: { "a.x": counts(5, 1, 4, 0), "b.y": counts(2, 1, 0, 1) }, refusals: {} } },
  calls: { state: "available", value: { rows: [call("t1", "a.x"), call("t2", "b.y"), call("t3", "a.x")], truncated: 0, moves: {}, journeys: {} } },
});

describe("environmentOf", () => {
  it("is the environment and the window, as strings, or `not yet` with no live source", () => {
    expect(Live.environmentOf(live)).toEqual({ name: "staging", windowMs: "1800000" });
    expect(Live.environmentOf(dataWith(null))).toEqual({ name: "not yet", windowMs: "not yet" });
  });
});

describe("tallyOf", () => {
  it("sums every operation, or only the ones asked for, and counts an operation the window never saw as none", () => {
    expect(Live.tallyOf(live)).toEqual({ calls: "7", answered: "2", refused: "4", defects: "1" });
    expect(Live.tallyOf(live, ["a.x", "nothing"])).toEqual({ calls: "5", answered: "1", refused: "4", defects: "0" });
    expect(Live.tallyOf(live, "b.y").calls).toBe("2");
  });

  it("says `not yet` for every number when the metrics could not be read, never zero", () => {
    expect(Live.tallyOf(dataWith(null)).calls).toBe("not yet");
    expect(Live.tallyOf(dataWith({ metrics: { state: "unavailable", reason: "down" } })).defects).toBe("not yet");
  });
});

describe("lastCalls and whyNot", () => {
  it("lists the newest two calls of the operations asked for", () => {
    expect(Live.lastCalls(live).map((c) => c.trace)).toEqual(["t1", "t2"]);
    expect(Live.lastCalls(live, ["a.x"]).map((c) => c.trace)).toEqual(["t1", "t3"]);
  });

  it("gives the reason a source has nothing to draw, and none when it is there", () => {
    expect(Live.whyNot(live, "metrics")).toBeUndefined();
    expect(Live.whyNot(dataWith(null), "calls")).toMatch(/no telemetry source/);
    expect(Live.whyNot(dataWith({ calls: { state: "unavailable", reason: "source failed" } }), "calls")).toBe("source failed");
  });
});
