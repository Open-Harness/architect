// The metrics reader: `ortho.calls` over a window, from the collector's `metrics.jsonl`, in either temporality.
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Effect } from "effect";
import { afterAll, describe, expect, it } from "vitest";
import { FileMetrics } from "./service.ts";

const dir = mkdtempSync(join(tmpdir(), "metrics-"));
afterAll(() => rmSync(dir, { recursive: true, force: true }));
const NOW = Date.UTC(2026, 10, 17, 12, 0, 0);
const nano = (ms: number) => String(BigInt(ms) * 1_000_000n);
const attrs = (labels: Record<string, string>) => Object.entries(labels).map(([key, v]) => ({ key, value: { stringValue: v } }));
const export_ = (temporality: number, points: ReadonlyArray<{ at: number; value: number; labels: Record<string, string> }>) => JSON.stringify({
  resourceMetrics: [{ scopeMetrics: [{ metrics: [{ name: "ortho.calls", sum: { aggregationTemporality: temporality, isMonotonic: true, dataPoints: points.map((p) => ({ attributes: attrs(p.labels), timeUnixNano: nano(p.at), asInt: String(p.value) })) } }, { name: "ortho.call.duration", histogram: { dataPoints: [] } }] }] }],
});
const read = async (name: string, lines: ReadonlyArray<string>, since = 1_800_000) => {
  const folder = join(dir, name);
  mkdirSync(folder, { recursive: true });
  writeFileSync(join(folder, "metrics.jsonl"), lines.join("\n") + "\n");
  return Effect.runPromise(FileMetrics.open(folder).window(since, NOW));
};
const claim = { operation: "handle.claim", outcome: "answered" };
const refused = { operation: "handle.claim", outcome: "refused", refusal: "NotAllowed" };

describe("FileMetrics.window", () => {
  it("cumulative totals: what grew in the window, not the running total", async () => {
    const got = await read("cumulative", [
      export_(2, [{ at: NOW - 3_600_000, value: 10, labels: claim }]),
      export_(2, [{ at: NOW - 600_000, value: 14, labels: claim }, { at: NOW - 600_000, value: 3, labels: refused }]),
    ]);
    expect(got).toEqual(expect.arrayContaining([{ name: "ortho.calls", labels: claim, value: 4 }, { name: "ortho.calls", labels: refused, value: 3 }]));
    expect(got).toHaveLength(2);
  });

  it("delta points: the ones in the window are summed, the older ones are out", async () => {
    const got = await read("delta", [
      export_(1, [{ at: NOW - 3_600_000, value: 9, labels: claim }, { at: NOW - 900_000, value: 2, labels: claim }, { at: NOW - 60_000, value: 1, labels: claim }]),
    ]);
    expect(got).toEqual([{ name: "ortho.calls", labels: claim, value: 3 }]);
  });

  it("a total that fell is a restart, a series with nothing in the window is absent, and no file is no points", async () => {
    const got = await read("restart", [
      export_(2, [{ at: NOW - 3_600_000, value: 50, labels: claim }, { at: NOW - 60_000, value: 2, labels: claim }, { at: NOW - 3_000_000, value: 7, labels: refused }]),
    ]);
    expect(got).toEqual([{ name: "ortho.calls", labels: claim, value: 2 }]);
    expect(await Effect.runPromise(FileMetrics.open(join(dir, "nowhere")).window(1_800_000, NOW))).toEqual([]);
  });

  it("a restart inside the window keeps what was counted before it", async () => {
    const got = await read("reset", [
      export_(2, [{ at: NOW - 3_600_000, value: 10, labels: claim }, { at: NOW - 1_200_000, value: 15, labels: claim }, { at: NOW - 600_000, value: 2, labels: claim }]),
    ]);
    expect(got).toEqual([{ name: "ortho.calls", labels: claim, value: 7 }]);
  });

  it("two producers that count the same name and labels are two series: their growth is summed, not merged", async () => {
    const fromProducer = (service: string, value: number) => JSON.stringify({
      resourceMetrics: [{ resource: { attributes: [{ key: "service.instance.id", value: { stringValue: service } }] }, scopeMetrics: [{ scope: { name: "ortho" }, metrics: [{ name: "ortho.calls", sum: { aggregationTemporality: 2, dataPoints: [{ attributes: attrs(claim), timeUnixNano: nano(NOW - 300_000), asInt: String(value) }] } }] }] }],
    });
    expect(await read("producers", [fromProducer("a", 10), fromProducer("b", 20)])).toEqual([{ name: "ortho.calls", labels: claim, value: 30 }]);
  });

  it("a file that is not metrics is a failure that says so, never a guess", async () => {
    const folder = join(dir, "broken");
    mkdirSync(folder, { recursive: true });
    writeFileSync(join(folder, "metrics.jsonl"), "not json\n");
    const result = await Effect.runPromise(Effect.result(FileMetrics.open(folder).window(1_800_000, NOW)));
    expect(result._tag).toBe("Failure");
  });
});
