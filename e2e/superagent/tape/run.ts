// `node --import tape/register.mjs tape/run.ts <app copy> <journey file name>`: judge one journey against its tape, then against every way of
// making the tape wrong, and print what happened as one JSON line. A subprocess, so the three specifiers a journey imports that name
// packages not yet built can be pointed at throwaway descriptors without touching any other check (hooks.mjs).
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { Scripting } from "orthograph/server";
import type { Assertion, Journey } from "orthograph";
import { Effect } from "effect";
import { EventNames } from "orthograph/server";
import { judge, mutants, scriptOf, stepData, titleOf, useNames, useProve } from "./engine.ts";
import type { StepData, StepResult, Tape } from "./engine.ts";

const [root, name] = process.argv.slice(2) as [string, string];
const load = async (rel: string) => ((await import(pathToFileURL(join(root, rel)).href)) as { default: unknown }).default;
// Prove's own checks, by their internal path: `packages/prove` does not export them, and the framework is not changed for a check's sake.
const prove = (await import(pathToFileURL(join(process.env["TAPE_REPO"]!, "packages/prove/src/modules/journeys/internal/checks.ts")).href)) as { runChecks: never };
useProve(prove, (effect) => Effect.runSync(effect as never) as never);
// An event is named by the identifier it is exported as, as the generated api names it for prove.
for (const [key, value] of Object.entries((await import(pathToFileURL(join(root, "kit/ops.ts")).href)) as Record<string, unknown>)) if ((value as { kind?: unknown } | null)?.kind === "event") EventNames.name(value as never, key);
useNames((event) => EventNames.nameOf(event as never));
const journey = (await load(`journeys/${name}.ts`)) as Journey;
const tape = (await load(`tapes/${name}.ts`)) as Tape;
// The good journal of each step that asks for events, written by hand beside the tape (`tapes/<name>.journal.ts`): `{ "#n": [[Event, fields], ...] }`.
const journals = ((await import(pathToFileURL(join(root, `tapes/${name}.journal.ts`)).href).catch(() => ({ default: {} }))) as { default: Record<string, ReadonlyArray<readonly [unknown, Record<string, unknown>]>> }).default;
for (const [key, events] of Object.entries(journals)) (tape.steps as Record<string, StepData>)[key] = { ...(tape.steps[key] ?? {}), events } as StepData;
const steps = journey.steps(scriptOf(journey.cast) as never);
const titles = steps.map((s) => s.title);

const failing = (rs: ReadonlyArray<StepResult>) => rs.filter((r) => !r.ok).map((r) => r.title);
const good = judge(journey, tape);

// A planted tape: the good one with one step's data made wrong. It must fail at that step, and at no other.
const plants = tape.plants.map((p) => {
  const title = titleOf(titles, p.step) ?? p.step;
  const data = p.with(stepData(tape, title, titles.indexOf(title)));
  return { name: p.name, step: title, failedAt: failing(judge(journey, tape, { step: title, data })) };
});

// Every way to make one step's recorded answer wrong, and whether the step's checks read the part that was changed: a change the checks
// read and let through is a hollow check; a part no check reads is listed, for the table of what each check reads.
const readsOf = (checks: ReadonlyArray<Assertion>) => checks.filter((c): c is Extract<Assertion, { kind: "expect" | "expect-equal" }> => c.kind === "expect" || c.kind === "expect-equal");
const mutantRuns: Array<{ step: string; path: string; kind: string; read: boolean; failed: boolean }> = [];
for (const [i, step] of steps.entries()) {
  const reads = readsOf(step.checks);
  const data = stepData(tape, step.title, i);
  if (reads.length === 0 || data?.answer === undefined) continue;
  const pick = (answer: unknown) => reads.map((c) => { try { return JSON.stringify(c.pick(answer), (_, v) => (typeof v === "bigint" ? `${v}n` : v === undefined ? "undefined" : v)); } catch { return "threw"; } });
  const base = pick(data.answer);
  for (const m of mutants(data.answer)) {
    const read = JSON.stringify(pick(m.answer)) !== JSON.stringify(base);
    mutantRuns.push({ step: step.title, path: m.path, kind: m.kind, read, failed: failing(judge(journey, tape, { step: step.title, data: { ...data, answer: m.answer } as StepData })).includes(step.title) });
  }
}

// The events a step asks for: leave out each one a check reads, and make each field a check reads wrong, one at a time.
const eventRuns: Array<{ step: string; what: string; failed: boolean }> = [];
for (const [n, step] of steps.entries()) {
  const own = stepData(tape, step.title, n);
  const events = own.events ?? [];
  const asks = step.checks.flatMap((c) => (c.kind === "emits" ? [c] : []));
  const run = (changed: ReadonlyArray<readonly [unknown, Record<string, unknown>]>) => failing(judge(journey, tape, { step: step.title, data: { ...own, events: changed } })).includes(step.title);
  for (const c of asks) {
    const at = events.findIndex(([e]) => e === c.event);
    if (at < 0) continue;
    if (events.filter(([e]) => e === c.event).length === 1) eventRuns.push({ step: step.title, what: `leave out ${EventNames.nameOf(c.event as never)}`, failed: run(events.filter((_, j) => j !== at)) });
    const fields = Scripting.resolve(c.fields, { world: tape.world, last: own.answer ?? {}, cast: {} }).value as Record<string, unknown>;
    for (const k of Object.keys(fields)) {
      const v = events[at]![1][k];
      const wrong = typeof v === "bigint" ? v + 1n : typeof v === "string" ? `${v}-x` : typeof v === "number" ? v + 1 : "__wrong__";
      eventRuns.push({ step: step.title, what: `${EventNames.nameOf(c.event as never)} field ${k} wrong`, failed: run(events.map(([e, f], j) => [e, j === at ? { ...f, [k]: wrong } : f] as const)) });
    }
  }
  if (step.checks.some((c) => c.kind === "no-events")) eventRuns.push({ step: step.title, what: "an event where none is allowed", failed: run([[journey, {}]]) });
}

// Something added (the author skill's proof 5): a step whose title claims "only" or "nothing" and which asks for an event, with one event more
// in its journal than a correct system writes. `emits` is a subset match, so the step itself rarely sees it; it must then be caught by a
// planted tape that `follows` it at a later step, the place a wrong build's extra change shows (#934). The plants are judged above. Its limit:
// this proves that some later step is named as catching it and that its plant fails there, not that the plant is the extra change itself;
// the plant's name says which change it stands for, and a reviewer reads it. Steps are chosen by the words of their titles.
const extraRuns = steps.flatMap((step, n) => {
  if (!/\b(only|nothing)\b/.test(step.title) || !step.checks.some((c) => c.kind === "emits")) return [];
  const own = stepData(tape, step.title, n);
  const atStep = failing(judge(journey, tape, { step: step.title, data: { ...own, events: [...(own.events ?? []), [journey, {}] as const] } })).includes(step.title);
  const followers = tape.plants.filter((p) => p.follows !== undefined && titleOf(titles, p.follows) === step.title && titles.indexOf(titleOf(titles, p.step) ?? "") > n).map((p) => p.name);
  return [{ step: step.title, atStep, followers }];
});

if (process.env["TAPE_DUMP"]) {
  const dump = steps.flatMap((step, n) => {
    const asks = step.checks.flatMap((c) => (c.kind === "emits" ? [c] : []));
    return asks.length === 0 ? [] : [{ n: n + 1, asks: asks.map((c) => ({ event: EventNames.nameOf(c.event as never), fields: Scripting.resolve(c.fields, { world: tape.world, last: {}, cast: {} }).value })) }];
  });
  console.log(JSON.stringify({ name, dump }, (_, v) => (typeof v === "bigint" ? { $big: v.toString() } : v)));
  process.exit(0);
}
console.log(JSON.stringify({ name, journey: journey.name, titles, unknownTapeSteps: Object.keys(tape.steps).filter((k) => !titles.includes(titleOf(titles, k) ?? "")), unknownPlantSteps: tape.plants.filter((p) => !titles.includes(titleOf(titles, p.step) ?? "")).map((p) => p.name), good: failing(good), plants, mutantRuns, eventRuns, extraRuns }));
