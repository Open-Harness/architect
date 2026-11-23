// The metrics reader over the collector's files (portal.md hole 2): what `ortho.calls` counted in a window. It reads `metrics.jsonl`, OTLP
// JSON lines, and answers each series' growth over the window, whichever temporality the exporter used: a delta point is what was counted
// in its interval, a cumulative one is a running total, so its growth is its last total in the window less the total just before it.
import { existsSync, readFileSync } from "node:fs";
import { Effect } from "effect";
import { SourceFailed, type MetricPoint, type MetricsSource } from "../types.ts";

interface RawPoint { readonly attributes?: ReadonlyArray<{ readonly key: string; readonly value: { readonly stringValue?: string } }>; readonly timeUnixNano?: string; readonly asInt?: string; readonly asDouble?: number }
interface RawMetric { readonly name: string; readonly sum?: { readonly aggregationTemporality?: number | string; readonly dataPoints?: ReadonlyArray<RawPoint> } }
interface Sample { readonly producer: string; readonly name: string; readonly labels: Readonly<Record<string, string>>; readonly at: number; readonly value: number; readonly delta: boolean }

const DELTA = new Set<unknown>([1, "AGGREGATION_TEMPORALITY_DELTA"]);

/** Every counter data point in the files, in the order exported. */
const samplesIn = (dirs: ReadonlyArray<string>): Array<Sample> =>
  dirs.flatMap((dir) => {
    const file = `${dir}/metrics.jsonl`;
    if (!existsSync(file)) return [];
    // Whole lines only: the exporter may be mid-line, and the next read sees it complete.
    return readFileSync(file, "utf8").split("\n").slice(0, -1).filter((l) => l.trim() !== "").flatMap((line) => {
      const doc = JSON.parse(line) as { resourceMetrics?: ReadonlyArray<{ resource?: { attributes?: ReadonlyArray<unknown> }; scopeMetrics?: ReadonlyArray<{ scope?: unknown; metrics?: ReadonlyArray<RawMetric> }> }> };
      return (doc.resourceMetrics ?? []).flatMap((r) => (r.scopeMetrics ?? []).flatMap((s) => (s.metrics ?? []).map((metric) => ({ metric, producer: `${dir}\u0000${JSON.stringify(r.resource?.attributes ?? [])}\u0000${JSON.stringify(s.scope ?? null)}` })))).flatMap(({ metric, producer }) =>
        (metric.sum?.dataPoints ?? []).map((point): Sample => ({
          producer, name: metric.name,
          labels: Object.fromEntries((point.attributes ?? []).map(({ key, value }) => [key, value.stringValue ?? ""])),
          at: Number(BigInt(point.timeUnixNano ?? "0") / 1_000_000n),
          value: Number(point.asInt ?? point.asDouble ?? 0),
          delta: DELTA.has(metric.sum?.aggregationTemporality),
        })));
    });
  });

/** A series is one producer's counter: its resource, its scope and its source folder tell two processes that count the same name and labels apart. */
const keyOf = (s: Sample) => `${s.producer}\u0000${s.name}\u0000${JSON.stringify(Object.entries(s.labels).sort(([a], [b]) => (a < b ? -1 : 1)))}`;

/** One series' growth in `(from, now]`: its samples walked in order, each adding what it grew by, or its whole total after a restart (a total that fell). */
const growth = (series: ReadonlyArray<Sample>, from: number, now: number): number => {
  const sorted = [...series].filter((s) => s.at <= now).sort((a, b) => a.at - b.at);
  if (sorted.length === 0) return 0;
  if (sorted[0]!.delta) return sorted.filter((s) => s.at > from).reduce((n, s) => n + s.value, 0);
  // With no sample before the window the series is counted from zero. That is exact in a prove world: its collector is made fresh and its
  // counters start with it, so nothing was counted before its first sample. An older series would need history, which is M7.14's.
  let previous = [...sorted].reverse().find((s) => s.at <= from)?.value ?? 0;
  let total = 0;
  for (const sample of sorted.filter((s) => s.at > from)) {
    total += sample.value >= previous ? sample.value - previous : sample.value;
    previous = sample.value;
  }
  return total;
};

const labelsKey = (labels: Readonly<Record<string, string>>) => JSON.stringify(Object.entries(labels).sort(([a], [b]) => (a < b ? -1 : 1)));

export const fileMetrics = (dirs: ReadonlyArray<string>): MetricsSource => ({
  window: (since, now) =>
    Effect.try({ try: () => samplesIn(dirs), catch: () => new SourceFailed({ message: "the collector's metrics could not be read" }) }).pipe(
      Effect.map((samples) => {
        const series = new Map<string, Array<Sample>>();
        for (const s of samples) series.set(keyOf(s), [...(series.get(keyOf(s)) ?? []), s]);
        // Each producer's growth is its own; what the portal reads is the sum over producers of the same name and labels.
        const summed = new Map<string, MetricPoint>();
        for (const all of series.values()) {
          const grew = growth(all, now - since, now);
          const key = `${all[0]!.name}\u0000${labelsKey(all[0]!.labels)}`;
          const held = summed.get(key);
          summed.set(key, { name: all[0]!.name, labels: all[0]!.labels, value: (held?.value ?? 0) + grew });
        }
        return [...summed.values()].filter((p) => p.value > 0);
      }),
    ),
});
