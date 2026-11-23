import { OUTPUTS, type CellId, type SwitchedOn } from "../grid/types.ts";
import type { JourneyView, Row, TouchesApi, TouchModel, WorldView } from "./types.ts";

const visible = (fields: Readonly<Record<string, { readonly visibility?: unknown }>> | undefined) => Object.entries(fields ?? {}).filter(([, f]) => f.visibility !== undefined).map(([name]) => name);

/** A `refuses` check names a declared error, `NotAllowed`, or a thing's own refusal as `<thing>.notFrom` or `<thing>.notFound` (journeys.ts). */
const refusalName = (model: TouchModel, error: string): string => {
  const [thing, rest] = error.split(".");
  if (thing === undefined) return error;
  if (rest === "notFrom") return model.things[thing]?.machine?.notFrom.error ?? error;
  if (rest === "notFound") return model.things[thing]?.notFound?.error ?? error;
  return error;
};

const green = (report: ReadonlyArray<string>, name: string) => {
  const line = report.find((l) => l.startsWith(`journey ${name} `));
  const found = line === undefined ? null : /^journey .* ✔ (\d+)\/(\d+) steps$/.exec(line);
  return found !== null && found[1] === found[2];
};

/** The worlds a journey starts in, from the oldest ancestor to its own (`funded` grows from `founded`); a loop in `from` stops at the repeat. */
const ancestry = (model: TouchModel, start: string | null | undefined): ReadonlyArray<WorldView> => {
  const chain: Array<WorldView> = [];
  for (let name: string | null | undefined = start; name != null && !chain.some((w) => w.name === name);) {
    const world: WorldView | undefined = model.startingWorlds?.[name];
    if (world === undefined) break;
    chain.unshift(world);
    name = world.from;
  }
  return chain;
};

/** The rules a call touches (G5): every rule of the operation's own thing, and each rule the model says the operation can break, which may be another thing's. */
const ruleRows = (model: TouchModel, op: TouchModel["operations"][string]): ReadonlyArray<Row> => [
  ...Object.keys(model.things[op.thing]?.invariants ?? {}).map((rule) => `${op.thing}.${rule}`),
  ...Object.values(op.invariants ?? {}),
].map((subject): Row => ({ block: "invariant", subject }));

/** What one call touches: its operation, the operation's thing, steps, machine, event and the fields it keeps from some callers. */
const callRows = (model: TouchModel, operation: string): ReadonlyArray<Row> => {
  const op = model.operations[operation];
  if (op === undefined) return [{ block: "operation", subject: operation }];
  return [
    { block: "operation", subject: operation },
    { block: "thing", subject: op.thing },
    ...Object.values(op.steps ?? {}).map((s): Row => ({ block: "step", subject: s.name })),
    ...(op.move == null ? [] : [{ block: "machine", subject: op.thing } as Row, { block: "event", subject: op.move.emits } as Row]),
    ...[...visible(op.payload), ...visible(op.answer), ...visible(model.things[op.thing]?.fields)].map((field): Row => ({ block: "visibility", subject: `${op.thing}.${field}` })),
    ...ruleRows(model, op),
  ];
};

const roleRow = (cast: JourneyView["cast"], actor: string): ReadonlyArray<Row> => {
  const who = cast?.[actor];
  return who?.kind === "role" && who.role !== undefined ? [{ block: "roles", subject: who.role }] : [];
};

const rowsOf = (model: TouchModel, journey: JourneyView): ReadonlyArray<Row> => {
  const rows: Array<Row> = [{ block: "journey", subject: journey.name }];
  // The calls a starting world makes are the journey's too: its ancestry is walked, and each world's own cast names the roles.
  for (const world of ancestry(model, journey.starts)) {
    for (const made of world.makes) if (made !== null) rows.push(...callRows(model, made.operation), ...roleRow(world.cast, made.actor));
  }
  for (const step of journey.steps) {
    // A skipped step ran nothing: its operation is outside the model, so it touches nothing.
    if (step.skipped !== undefined) continue;
    rows.push(...callRows(model, step.call.operation), ...roleRow(journey.cast, step.call.actor));
    for (const check of step.checks) {
      if (check.kind === "refuses" && check.error !== undefined) rows.push({ block: "error", subject: refusalName(model, check.error) });
      if (check.kind === "emits" && check.event !== undefined) rows.push({ block: "event", subject: check.event });
    }
  }
  const seen = new Set<string>();
  return rows.filter((r) => { const key = `${r.block}:${r.subject}`; return seen.has(key) ? false : (seen.add(key), true); })
    .sort((a, b) => a.block.localeCompare(b.block) || a.subject.localeCompare(b.subject));
};

export const Touches: TouchesApi = {
  of: ({ model, journey, report }) => {
    const found = Object.values(model.journeys ?? {}).find((j) => j.name === journey);
    if (found === undefined) return { green: false, rows: [], problems: [`the model has no journey named "${journey}"`] };
    if (!green(report, journey)) return { green: false, rows: [], problems: [`prove did not report "${journey}" green (no "journey ${journey} ✔ n/n steps" line): a journey touches nothing until every step is green`] };
    return { green: true, rows: rowsOf(model, found), problems: [] };
  },
  entries: (touched, journey): ReadonlyArray<SwitchedOn> =>
    [...new Set(touched.rows.map((r) => r.block))].flatMap((block) => {
      const subjects = touched.rows.filter((r) => r.block === block).map((r) => r.subject);
      return OUTPUTS.map((output): SwitchedOn => ({ cell: `${block}.${output}` as CellId, subjects, switchedBy: journey }));
    }),
};
