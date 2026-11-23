// `node --import tape/register.mjs tape/run.ts <app copy> <journey file name>`: judge one journey against its tape, then against every way of
// making the tape wrong, and print what happened as one JSON line. A subprocess, so the three specifiers a journey imports that name
// packages not yet built can be pointed at throwaway descriptors without touching any other check (hooks.mjs).
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { Scripting } from "orthograph/server";
import type { Assertion, Journey } from "orthograph";
import { judge, mutants, scriptOf, stepData, titleOf } from "./engine.ts";
import type { StepData, StepResult, Tape } from "./engine.ts";

const [root, name] = process.argv.slice(2) as [string, string];
const load = async (rel: string) => ((await import(pathToFileURL(join(root, rel)).href)) as { default: unknown }).default;
const journey = (await load(`journeys/${name}.ts`)) as Journey;
const tape = (await load(`tapes/${name}.ts`)) as Tape;
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

// The events a step asks for: leave each one out, and make each field of each one wrong, one at a time.
const eventRuns: Array<{ step: string; what: string; failed: boolean }> = [];
for (const [n, step] of steps.entries()) {
  const own = stepData(tape, step.title, n);
  const env = { world: tape.world, last: own.answer ?? {}, cast: {} };
  const asked = step.checks.flatMap((c) => (c.kind === "emits" ? [[c.event, Scripting.resolve(c.fields, env).value as Record<string, unknown>] as const] : []));
  asked.forEach(([event, fields], i) => {
    const run = (events: ReadonlyArray<readonly [unknown, Record<string, unknown>]>) => failing(judge(journey, tape, { step: step.title, data: { ...own, events } })).includes(step.title);
    eventRuns.push({ step: step.title, what: `leave out event ${i}`, failed: run(asked.filter((_, j) => j !== i)) });
    for (const [k, v] of Object.entries(fields)) {
      const wrong = typeof v === "bigint" ? v + 1n : typeof v === "string" ? `${v}-x` : typeof v === "number" ? v + 1 : "__wrong__";
      eventRuns.push({ step: step.title, what: `event ${i} field ${k} wrong`, failed: run(asked.map(([e, f], j) => [e, j === i ? { ...f, [k]: wrong } : f] as const)) });
    }
  });
  if (step.checks.some((c) => c.kind === "no-events")) {
    eventRuns.push({ step: step.title, what: "an event where none is allowed", failed: failing(judge(journey, tape, { step: step.title, data: { ...own, events: [[journey, {}]] } })).includes(step.title) });
  }
}

console.log(JSON.stringify({ name, journey: journey.name, titles, unknownTapeSteps: Object.keys(tape.steps).filter((k) => !titles.includes(titleOf(titles, k) ?? "")), unknownPlantSteps: tape.plants.filter((p) => !titles.includes(titleOf(titles, p.step) ?? "")).map((p) => p.name), good: failing(good), plants, mutantRuns, eventRuns }));
