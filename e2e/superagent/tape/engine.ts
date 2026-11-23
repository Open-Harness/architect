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
export interface Plant { readonly name: string; readonly step: string; readonly with: (good: StepData) => StepData }
export interface Tape { readonly world: Record<string, unknown>; readonly steps: Readonly<Record<string, StepData>>; readonly plants: ReadonlyArray<Plant> }
export interface StepResult { readonly title: string; readonly ok: boolean; readonly why: string }

const same = (a: Json, b: Json): boolean => {
  if (typeof a === "bigint" || typeof b === "bigint") return a === b;
  if (Array.isArray(a)) return Array.isArray(b) && a.length === b.length && a.every((x, i) => same(x, b[i]));
  if (typeof a === "object" && a !== null) {
    if (typeof b !== "object" || b === null || Array.isArray(b)) return false;
    const ka = Object.keys(a).filter((k) => (a as Record<string, Json>)[k] !== undefined), kb = Object.keys(b).filter((k) => (b as Record<string, Json>)[k] !== undefined);
    return ka.length === kb.length && ka.every((k) => same((a as Record<string, Json>)[k], (b as Record<string, Json>)[k]));
  }
  return Object.is(a, b);
};
const show = (x: Json) => JSON.stringify(x, (_, v) => (typeof v === "bigint" ? `${v}n` : v === undefined ? "undefined" : v));

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

/** The events a step's own `emits` checks ask for, resolved: what a correct system's journal held for this step. */
const wanted = (checks: ReadonlyArray<Assertion>, env: Record<string, unknown>) =>
  checks.flatMap((c) => (c.kind === "emits" ? [[c.event, Scripting.resolve(c.fields, env).value as Record<string, unknown>] as const] : []));

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
    // 2. the checks, seeing this step's own answer as `last`
    const env = { world: tape.world, last: answer, cast: {} };
    const events = data.events ?? wanted(step.checks, env);
    const fails: Array<string> = [];
    for (const c of step.checks) {
      if (c.kind === "expect-equal") {
        const want = Scripting.resolve(c.value, env).value;
        try { const got = c.pick(answer); if (!same(got, want)) fails.push(`expected ${show(want)}, got ${show(got)}`); } catch (e) { fails.push(`reading the answer threw: ${String(e)}`); }
      } else if (c.kind === "expect") {
        try { const got = String(c.pick(answer)); if (!c.match.test(got)) fails.push(`expected a match of ${c.match}, got ${show(got)}`); } catch (e) { fails.push(`reading the answer threw: ${String(e)}`); }
      } else if (c.kind === "emits") {
        const fields = Scripting.resolve(c.fields, env).value as Record<string, unknown>;
        const hit = events.some(([e, f]) => e === c.event && Object.entries(fields).every(([k, v]) => same(f[k], v)));
        if (!hit) fails.push(`expected the event ${show(Object.keys(c.event.fields))} with ${show(fields)}, got ${events.length} event(s)`);
      } else if (c.kind === "no-events") {
        if (events.length > 0) fails.push(`expected no events, got ${events.length}`);
      } else throw new Error(`the tape runner does not judge a ${c.kind} check`);
    }
    results.push({ title: step.title, ok: fails.length === 0, why: fails.join("; ") });
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
