import { describe, expect, it } from "vitest";
import { slots } from "./service.ts";
import { RESERVE } from "./types.ts";

describe("the line", () => {
  it("puts every person's message first and keeps each group oldest first", () => {
    const waiting = [{ assignment: "a", why: "launch" }, { assignment: "b", why: "person" }, { assignment: "c", why: "input" }, { assignment: "d", why: "person" }] as const;
    expect(slots.line(waiting).map((w) => w.assignment)).toEqual(["b", "d", "a", "c"]);
  });
});

describe("a seat", () => {
  it("is the lowest free of the pool", () => {
    expect(slots.seatFor(3n, new Set(), "launch")).toBe(1n);
    expect(slots.seatFor(3n, new Set([1n, 3n]), "launch")).toBe(2n);
  });
  it("is none for a launch once the pool is full, whatever the reserve holds", () => {
    expect(slots.seatFor(2n, new Set([1n, 2n]), "launch")).toBeUndefined();
    expect(slots.seatFor(2n, new Set([1n, 2n]), "input")).toBeUndefined();
  });
  it("is the reserve for a person once the pool is full, and only while the reserve is free", () => {
    expect(slots.seatFor(2n, new Set([1n, 2n]), "person")).toBe(RESERVE);
    expect(slots.seatFor(2n, new Set([1n, 2n, RESERVE]), "person")).toBeUndefined();
  });
  it("is a pool seat for a person while one is free: the reserve stays free", () => {
    expect(slots.seatFor(2n, new Set([1n]), "person")).toBe(2n);
  });
});
