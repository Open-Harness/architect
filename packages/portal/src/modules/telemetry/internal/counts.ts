// The window's counts, from `ortho.calls`. Pure. Only declared operations and declared refusals are named: a label the model does not
// declare is dropped, so a mislabelled series can never put a value on a page. A refusal counted here that no span accounts for opened no
// span (a door refusal): it is a count, never a row.
import type { BlueprintWire } from "#modules/wire/types.js";
import type { CountsView, MetricPoint, OperationCounts, RefusalCounts } from "../types.ts";
import type { SpanRefusals } from "./calls.ts";
import { RUNTIME_REFUSALS } from "./spans.ts";

/** Every refusal name the model declares: the code table, and each operation's own lists. */
export const refusalNames = (blueprint: BlueprintWire): ReadonlyArray<string> => {
  const model = blueprint.model;
  return [...new Set([
    ...Object.keys(model.refusals ?? {}),
    ...Object.values(model.operations).flatMap((op) => [...op.errors, ...op.refusals]),
  ])].sort();
};

export const countsOf = (blueprint: BlueprintWire, points: ReadonlyArray<MetricPoint>, spans: SpanRefusals | undefined): CountsView => {
  const operations = new Set(Object.keys(blueprint.model.operations));
  const declared = refusalNames(blueprint);
  // A name is allowed when the model declares it or the runtime makes it whatever the model says (`InvalidPayload`, `IdempotencyConflict`).
  const names = new Set([...declared, ...RUNTIME_REFUSALS]);
  const tally = new Map<string, { calls: number; answered: number; refused: number; defects: number; refusals: Map<string, number> }>();
  for (const op of operations) tally.set(op, { calls: 0, answered: 0, refused: 0, defects: 0, refusals: new Map() });
  for (const point of points) {
    const op = point.labels["operation"];
    const held = op === undefined ? undefined : tally.get(op);
    if (point.name !== "ortho.calls" || held === undefined) continue;
    const outcome = point.labels["outcome"];
    const refusal = point.labels["refusal"];
    held.calls += point.value;
    if (outcome === "answered") held.answered += point.value;
    else if (outcome === "defect") held.defects += point.value;
    else if (outcome === "refused") {
      held.refused += point.value;
      if (refusal !== undefined && names.has(refusal)) held.refusals.set(refusal, (held.refusals.get(refusal) ?? 0) + point.value);
    }
  }
  const spanCount = (op: string, name: string) => spans?.get(`${op}\u0000${name}`)?.count ?? 0;
  const door = (op: string, name: string, counted: number) => (spans === undefined ? null : Math.max(0, counted - spanCount(op, name)));
  const byOperation: Record<string, OperationCounts> = {};
  const byRefusal = new Map<string, { count: number; door: number | null }>(declared.map((n) => [n, { count: 0, door: spans === undefined ? null : 0 }]));
  for (const [op, held] of tally) {
    let doors: number | null = spans === undefined ? null : 0;
    for (const [name, counted] of held.refusals) {
      const d = door(op, name, counted);
      if (doors !== null && d !== null) doors += d;
      const total = byRefusal.get(name) ?? { count: 0, door: spans === undefined ? null : 0 };
      byRefusal.set(name, { count: total.count + counted, door: total.door === null || d === null ? null : total.door + d });
    }
    byOperation[op] = { calls: held.calls, answered: held.answered, refused: held.refused, defects: held.defects, refusals: Object.fromEntries([...held.refusals].sort(([a], [b]) => (a < b ? -1 : 1))), doorRefusals: doors };
  }
  const newest = (name: string): string | null => [...(spans?.values() ?? [])].filter((s) => s.name === name).sort((a, b) => b.start - a.start)[0]?.trace ?? null;
  const refusals: Record<string, RefusalCounts> = {};
  for (const [name, total] of byRefusal) refusals[name] = { count: total.count, door: total.door, trace: newest(name) };
  return { operations: byOperation, refusals };
};
