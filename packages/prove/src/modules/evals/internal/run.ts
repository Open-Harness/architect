// Eval 7 (performance, review only) and eval 8 (coverage: each operation's, and the run's in one line).
import type { Model, OperationModel } from "@orthograph/compiler";
import type { Evidence, PerOperation, Verdict } from "../types.ts";
import { answered, attr } from "./evidence.ts";

export const percentile = (sorted: ReadonlyArray<number>, p: number) => sorted[Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)] ?? 0;
const ms = (n: number) => `${Math.round(n)}ms`;

/** 7. p50 and p95 of the operation's spans against its budget. Over 1.5 times the budget is a review, never a failure. */
export const performance: PerOperation = (op, evidence) => {
  const times = evidence.flatMap((e) => (e.opSpan ? [e.opSpan.ms] : [])).sort((a, b) => a - b);
  const budget = op.budget?.p95Ms;
  if (times.length === 0) return { eval: "performance", operation: op.name, failures: [], notes: ["no timed calls"] };
  const p50 = percentile(times, 50);
  const p95 = percentile(times, 95);
  const notes = [`p50 ${ms(p50)} p95 ${ms(p95)}${budget === undefined ? " (no budget)" : ` budget p95 ${ms(budget)}`}`];
  if (budget !== undefined && p95 > 1.5 * budget) notes.push(`review: p95 ${ms(p95)} is over 1.5x budget`);
  return { eval: "performance", operation: op.name, failures: [], notes };
};

type Sets = ReturnType<typeof reachedIn>;

/** A rule's refusal is counted once for the rule, whichever operation broke it: its key is the rule's full name (`handle.oneHolderPerName`), never an operation's. */
const ruleKey = (rule: string) => `rule:${rule}`;

/** The rule a refused call was refused for: the span's `refusal.invariant`, else the rule the operation lists for that refusal. */
const ruleOf = (model: Model, e: Evidence): ReadonlyArray<string> => {
  const onSpan = attr(e, "refusal.invariant");
  const rule = typeof onSpan === "string" ? onSpan : e.refusal === undefined ? undefined : model.operations[e.call.operation]?.invariants?.[e.refusal];
  return rule === undefined ? [] : [ruleKey(rule)];
};

/** What the whole run reached: operations called, moves made, outcomes reached, refusals given. */
const reachedIn = (model: Model, evidence: ReadonlyArray<Evidence>) => {
  const thingOf = (e: Evidence) => model.operations[e.call.operation]?.thing;
  const moving = evidence.filter((e) => answered(e) && attr(e, "move.to") !== undefined);
  return {
    called: new Set(evidence.map((e) => e.call.operation)),
    moved: new Set(moving.map((e) => `${thingOf(e)}.${model.operations[e.call.operation]?.move?.key}`)),
    reached: new Set(moving.map((e) => `${thingOf(e)}:${String(attr(e, "move.to"))}`)),
    refused: new Set(evidence.flatMap((e) => (e.refusal ? [`${e.call.operation}:${e.refusal}`, ...ruleOf(model, e)] : []))),
  };
};

/**
 * The runtime's own refusals no journey can cause: every refusal the model codes under the runtime's prefix (`AR`, read from `NotAllowed`'s
 * code) except `NotAllowed`, which a step reaches by naming a caller who may not. `IdempotencyConflict` is one: it needs a second payload under
 * a held request key, and a journey step cannot send one. Counting it would leave it uncovered for ever (G3). The names come from the model.
 *
 * This is inferred from names ("every AR- refusal except NotAllowed"). When the next runtime refusal arrives, the model should carry a
 * "reachable from a journey" flag per refusal and this should read it (design/later.md, "From prove's coverage").
 */
const unreachable = (model: Model): ReadonlySet<string> => {
  const prefix = model.refusals?.["NotAllowed"]?.split("-")[0];
  return new Set(prefix === undefined ? [] : Object.entries(model.refusals).filter(([name, code]) => name !== "NotAllowed" && code.startsWith(`${prefix}-`)).map(([name]) => name));
};

const required = (op: OperationModel, skip: ReadonlySet<string> = new Set()) => ({
  move: op.move ? [`${op.thing}.${op.move.key}`] : [],
  outcomes: op.move ? op.move.to.map((s) => `${op.thing}:${s}`) : [],
  errors: op.errors.map((x) => `${op.name}:${x}`),
  // The rules this operation can break, each by its full name: the runtime's refusals for them are the rule's, counted with the declared ones.
  rules: [...new Set(Object.values(op.invariants ?? {}))].map(ruleKey),
  runtime: op.refusals.filter((r) => !op.errors.includes(r) && !(r in (op.invariants ?? {})) && !skip.has(r)).map((r) => `${op.name}:${r}`),
});

const gaps = (op: OperationModel, sets: Sets) => {
  if (!sets.called.has(op.name)) return [`${op.name} reached by no journey`];
  const r = required(op);
  return [
    ...r.move.filter((m) => !sets.moved.has(m)).map((m) => `move ${m} made by no journey`),
    ...r.outcomes.filter((s) => !sets.reached.has(s)).map((s) => `outcome ${s.replace(":", " ")} reached by no journey`),
    ...r.errors.filter((x) => !sets.refused.has(x)).map((x) => `${x.replace(":", " refusing ")} reached by no journey`),
    ...r.rules.filter((x) => !sets.refused.has(x)).map((x) => `rule ${x.slice("rule:".length)} refused by no journey`),
  ];
};

/**
 * 8. Coverage, per operation: called by some journey or starting world, its move made, every outcome reached and every
 * declared error refused. The runtime's own refusals (NotAllowed, the machine's) are counted but never required; the run's line counts only those a journey can cause (not `IdempotencyConflict`: see `unreachable`).
 */
export const coverage: PerOperation = (op, _mine, { project, all }) => {
  const failures = gaps(op, reachedIn(project.model, all));
  return { eval: "coverage", operation: op.name, failures, notes: [] };
};

/** The run's coverage in one line: what was reached of everything declared. It never fails; each operation's does. */
export const coverageSummary = (model: Model, evidence: ReadonlyArray<Evidence>): Verdict => {
  const sets = reachedIn(model, evidence);
  const skip = unreachable(model);
  const all = Object.values(model.operations).map((op) => required(op, skip));
  const count = (xs: ReadonlyArray<string>, hit: ReadonlySet<string>) => `${xs.filter((x) => hit.has(x)).length}/${xs.length}`;
  const left = [...skip].filter((name) => Object.values(model.operations).some((op) => op.refusals.includes(name) && !op.errors.includes(name)));
  const flat = (k: keyof ReturnType<typeof required>) => [...new Set(all.flatMap((r) => r[k]))];
  const notes = [`moves ${count(flat("move"), sets.moved)} · outcomes ${count(flat("outcomes"), sets.reached)} · refusals ${count([...flat("errors"), ...flat("rules")], sets.refused)} · runtime refusals ${count(flat("runtime"), sets.refused)}${left.length ? ` (not counted: ${left.join(", ")}, which no journey can cause: a step cannot send a second payload under a held request key)` : ""}`];
  return { eval: "coverage", operation: undefined, failures: [], notes };
};
