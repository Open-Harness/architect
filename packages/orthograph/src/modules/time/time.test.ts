import { describe, expect, it } from "vitest";
import { Clocks, Spans, Times } from "./service.ts";

describe("time", () => {
  it("declares a move made by time as plain data", () => {
    expect(Times.every("1 month", { from: "startedAt" })).toEqual({ kind: "every", span: "1 month", from: "startedAt" });
    expect(Times.every("1 month", { on: { day: 25 }, zone: "Europe/London" })).toEqual({ kind: "every", span: "1 month", on: { day: 25 }, zone: "Europe/London" });
    expect(Times.after("overdueAt", "14 days")).toEqual({ kind: "after", span: "14 days", field: "overdueAt" });
    expect(Object.isFrozen(Times.after("overdueAt", "14 days"))).toBe(true);
  });

  it("declares an environment's clock", () => {
    expect(Clocks.real()).toEqual({ kind: "clock", which: "real" });
    expect(Clocks.stepped({ starts: "2027-01-10T09:00:00Z" })).toEqual({ kind: "clock", which: "stepped", starts: "2027-01-10T09:00:00Z" });
    expect(Clocks.scaled({ starts: "2027-01-10T09:00:00Z" })).toMatchObject({ which: "scaled", speed: 1 });
  });

  it("reads a span from its words", () => {
    expect(Spans.read("14 days")).toEqual({ count: 14, unit: "day" });
    expect(Spans.read("1 month")).toEqual({ count: 1, unit: "month" });
    expect(Spans.read("a month")).toBeUndefined();
  });
});
