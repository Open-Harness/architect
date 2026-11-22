import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import type { BlueprintWire } from "#modules/wire/types.js";
import type { PortalLive, WindowTrace } from "./types.ts";
import { ROWS_MAX } from "./types.ts";
import { Telemetry } from "./service.ts";

const NOW = 1_800_000_000_000;
const blueprint = { model: { operations: { "a.go": { budget: { p95Ms: 100 }, errors: [], refusals: [], steps: {} } } } } as unknown as BlueprintWire;
const call = (n: number, ms: number): readonly [string, WindowTrace] => [`t${n}`, { logs: [], spans: [{ spanId: `s${n}`, parentSpanId: "", name: "a.go", ms, start: NOW - 1000 - n, status: 1, attrs: { operation: "a.go", attempt: 1 } }] }];

describe("the window's p95", () => {
  it("is taken over every call of the window, not over the rows that are sent: the newest ROWS_MAX fast calls hide 30 slow older ones", async () => {
    // 30 slow calls are the oldest; the 500 newest rows are all fast, so a p95 over the rows alone says 10 ms.
    const calls = [...Array.from({ length: ROWS_MAX }, (_, i) => call(i, 10)), ...Array.from({ length: 30 }, (_, i) => call(ROWS_MAX + i, 900))];
    const live: PortalLive = { environment: "local", now: NOW, windowMs: 30 * 60_000, source: { window: () => Effect.succeed(new Map(calls)), find: () => Effect.succeed(undefined) }, metrics: { window: () => Effect.succeed([]) } };
    const read = await Effect.runPromise(Telemetry.read(blueprint, live));
    if (read.calls.state !== "available") throw new Error("calls unavailable");
    expect(read.calls.value.rows.every((r) => r.durationMs === 10)).toBe(true);
    expect(read.calls.value.truncated).toBe(30);
    expect(read.calls.value.p95).toEqual({ "a.go": 900 });
    expect(read.calls.value.rows[0]).not.toHaveProperty("attemptSpans");
  });
});
