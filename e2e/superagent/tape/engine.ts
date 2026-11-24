// The tape runner's engine: a journey's steps judged against a recorded world instead of a running one.
//
// A "tape" is what a correct system would have answered at each step (an answer, the events its journal held), written by hand from the
// design records and never read back from the output it judges. The journey's own checks judge it, with the journey's own refs resolved by
// the framework's own `Scripting.resolve`. A planted tape is the good one with one step's data made wrong, and must fail at exactly that step.
// This is not a world: it proves each check can pass and cannot be passed hollow, until slice 9's instruments and `prove`'s new call kinds
// let the same journeys run for real (GOAL17-check-harness, "Slice 8 proves fairness against throwaways").
import { Scripting } from "orthograph/server";
import type { Assertion, Journey } from "orthograph";

type Json = unknown;
export interface StepData { readonly answer?: Json; readonly events?: ReadonlyArray<readonly [unknown, Record<string, unknown>]> }
/** `follows`: the earlier step (its title or `#<n>`) whose wrong output this plant is the later sign of, as a change applied as well as recorded shows only when a person later makes it herself (#934). */
export interface Plant { readonly name: string; readonly step: string; readonly follows?: string; readonly with: (good: StepData) => StepData }
export interface Tape { readonly world: Record<string, unknown>; readonly steps: Readonly<Record<string, StepData>>; readonly plants: ReadonlyArray<Plant> }
export interface StepResult { readonly title: string; readonly ok: boolean; readonly why: string }

/** The script a journey sees: the framework's own, with the three words GOAL17-check-harness call 0 adds, as plain data. */
export const scriptOf = (cast: Record<string, unknown>) => {
  const base = Scripting.script(cast as never) as unknown as Record<string, unknown> & { clock: Record<string, unknown> };
  return {
    ...base,
    clock: { ...base.clock, settle: () => ({ kind: "clock-call", move: { advance: "0 seconds" } }) },
    runner: { kill: (signal?: string) => ({ kind: "runner-call", move: "kill", ...(signal ? { signal } : {}) }), start: () => ({ kind: "runner-call", move: "start" }), restart: () => ({ kind: "runner-call", move: "restart" }) },
    together: (...calls: ReadonlyArray<unknown>) => ({ kind: "together-call", calls }),
  };
};

/** A step's tape is keyed by its title or by `#<n>`, its place in the journey (1 is the first): the second spares a long title being copied twice. */
export const stepData = (tape: Tape, title: string, index: number): StepData => tape.steps[title] ?? tape.steps[`#${index + 1}`] ?? {};
export const titleOf = (titles: ReadonlyArray<string>, key: string) => (/^#\d+$/.test(key) ? titles[Number(key.slice(1)) - 1] : key);

const payloadsOf = (call: Record<string, unknown>): ReadonlyArray<unknown> =>
  call["kind"] === "call" ? [call["payload"]] : call["kind"] === "stand-call" || call["kind"] === "world-call" ? [call["args"]] : call["kind"] === "together-call" ? (call["calls"] as Array<Record<string, unknown>>).flatMap(payloadsOf) : [];

/**
 * The judge is prove's own: each step's checks run through `runChecks` of `packages/prove/src/modules/journeys/internal/checks.ts`, on a `CallRecord` the tape
 * makes (the answer as the body, the journal as the entries the call's trace wrote). So `emits` reads the first journal entry of its name and subset-matches it, and
 * `expect(...).toBe` compares as prove does (values as they travel: bigints as text, keys in order). The module is not exported by `packages/prove`, so the runner
 * imports it by its internal path (tape/run.ts), in this check only, and passes it here.
 */
export interface Prove { readonly runChecks: (checks: ReadonlyArray<Assertion>, call: unknown, env: Record<string, unknown>, world: unknown) => unknown }
let prove: Prove | undefined;
let runSync: ((effect: unknown) => { readonly failures: ReadonlyArray<string> }) | undefined;
export const useProve = (p: Prove, run: (effect: unknown) => { readonly failures: ReadonlyArray<string> }) => { prove = p; runSync = run; };
let nameOf: (event: unknown) => string | undefined = () => undefined;
export const useNames = (f: (event: unknown) => string | undefined) => { nameOf = f; };

export const judge = (journey: Journey, tape: Tape, replace?: { readonly step: string; readonly data: StepData }): ReadonlyArray<StepResult> => {
  const steps = journey.steps(scriptOf(journey.cast) as never);
  const results: Array<StepResult> = [];
  let last: Json = {};
  for (const [i, step] of steps.entries()) {
    const data = replace?.step === step.title ? replace.data : stepData(tape, step.title, i);
    const answer = data.answer ?? {};
    const before = { world: tape.world, last, cast: {} };
    // 1. the data the call is given must be there: every ref in its payload names something the world or the step before gave
    const missing = payloadsOf(step.call as never).flatMap((p) => Scripting.resolve(p, before).missing);
    if (missing.length > 0) { results.push({ title: step.title, ok: false, why: `its call names ${missing.join(", ")}, which nothing gave` }); last = answer; continue; }
    // 2. a step that asks for an event needs a journal written for it: nothing is derived from the check
    if (step.checks.some((c) => c.kind === "emits") && data.events === undefined) { results.push({ title: step.title, ok: false, why: "the tape holds no journal for a step that asks for an event" }); last = answer; continue; }
    // 3. the checks, prove's, seeing this step's own answer as `last`
    const env = { world: tape.world, last: answer, cast: {} };
    const journal = (data.events ?? []).map(([event, fields]) => ({ event: nameOf(event) ?? "?", move: "tape", subject: "tape", fields }));
    const call = { journey: journey.name, step: step.title, actor: "tape", person: "per_tape", operation: "tape", payload: {}, status: 200, body: answer, trace: "t", parent: "p", mayCall: true, journal };
    const done = runSync!(prove!.runChecks(step.checks, call, env, { facts: {}, tableOf: () => undefined, nameOf: () => undefined }));
    results.push({ title: step.title, ok: done.failures.length === 0, why: done.failures.join("; ") });
    last = answer;
  }
  return results;
};

export interface Mutant { readonly path: string; readonly kind: string; readonly answer: Json }
/** Every way to make one answer wrong that a check could be blind to: each leaf changed or made wider, each part left out, each array shortened, added to or repeated. */
export const mutants = (value: Json, rebuild: (v: Json) => Json = (v) => v, path: ReadonlyArray<string | number> = []): ReadonlyArray<Mutant> => {
  const out: Array<Mutant> = [];
  const at = (kind: string, v: Json, where = path) => out.push({ path: where.join(".") || "(whole)", kind, answer: rebuild(v) });
  if (Array.isArray(value)) {
    if (value.length > 0) { at("left out", value.slice(0, -1)); at("repeated", [value[0], ...value]); }
    at("added", [...value, value.at(-1) ?? "extra"]); at("wider: null", null); at("wider: undefined", undefined);
    value.forEach((v, i) => out.push(...mutants(v, (nv) => rebuild(value.map((x, j) => (j === i ? nv : x))), [...path, i])));
  } else if (typeof value === "object" && value !== null) {
    const o = value as Record<string, Json>;
    for (const k of Object.keys(o)) { const { [k]: _gone, ...rest } = o; at("left out", rest, [...path, k]); }
    at("added", { ...o, extra: 1 });
    for (const k of Object.keys(o)) out.push(...mutants(o[k], (nv) => rebuild({ ...o, [k]: nv }), [...path, k]));
  } else {
    at("changed", typeof value === "number" ? value + 1 : typeof value === "bigint" ? value + 1n : typeof value === "boolean" ? !value : `${String(value)}-x`);
    at("wider: null", null); at("wider: undefined", undefined);
  }
  return out;
};
