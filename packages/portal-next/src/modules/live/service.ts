import { callsViewOf, countsOf, sum } from "./internal/read.ts";
import { NOT_YET, RAIL_CALLS, type LiveApi, type Tally } from "./types.ts";

const environmentOf: LiveApi["environmentOf"] = (d) => {
  const t = d.snapshot.telemetry;
  return t === null ? { name: NOT_YET, windowMs: NOT_YET } : { name: t.environment, windowMs: String(t.windowMs) };
};

const tallyOf: LiveApi["tallyOf"] = (d, operation): Tally => {
  const counts = countsOf(d);
  if (counts === undefined) return { calls: NOT_YET, answered: NOT_YET, refused: NOT_YET, defects: NOT_YET };
  const names = operation === undefined ? Object.keys(counts.operations) : typeof operation === "string" ? [operation] : operation;
  const ops = names.flatMap((n) => counts.operations[n] ?? []);
  return { calls: sum(ops, "calls"), answered: sum(ops, "answered"), refused: sum(ops, "refused"), defects: sum(ops, "defects") };
};

const lastCalls: LiveApi["lastCalls"] = (d, operations) =>
  (callsViewOf(d)?.rows ?? []).filter((r) => operations === undefined || operations.includes(r.operation)).slice(0, RAIL_CALLS);

const whyNot: LiveApi["whyNot"] = (d, source) => {
  const t = d.snapshot.telemetry;
  if (t === null) return "this portal has no telemetry source";
  const a = t[source];
  return a.state === "unavailable" ? a.reason : undefined;
};

export const Live: LiveApi = { environmentOf, tallyOf, lastCalls, whyNot };
