import { Effect, Schema } from "effect";
import type { Call, ClockCall, Operation, Principal, Read, StartingWorld, Thing } from "orthograph";
import { Blueprint } from "orthograph";
import { Scripting } from "orthograph/server";
import type { CallRecord, JourneyRun, JourneysApi, Project, StepResult } from "./types.ts";
import { callDevice, onDevice } from "./internal/device.ts";
import { keepersIn } from "./internal/keepers.ts";
import { loadProject } from "./internal/load.ts";
import { callOperation, castPeople, doorFacts, mayCall, signUpPeople, stateOf } from "./internal/world.ts";
import { databaseFacts } from "./internal/database-facts.ts";
import { d1Facts } from "./internal/d1-facts.ts";
import { subjectId } from "./internal/subject.ts";
import { runChecks, show } from "./internal/checks.ts";

type Codec = Schema.Codec<Record<string, unknown>, Record<string, unknown>>;

const nameOfOperation = (project: Project, op: Operation | Read) => [...project.operations].find(([, o]) => o === op)?.[0];
const tableOf = (project: Project) => (thing: Thing) => [...project.things].find(([, t]) => t === thing)?.[0];

const run: JourneysApi["run"] = (project, url, journey, index, how = "world", given, empty = false, device) =>
  Effect.gen(function* () {
    const world = journey.starts === undefined ? undefined : project.startingWorlds.get(journey.starts);
    // A starting world may begin from another: make the oldest first, so each sees what the one before it gave.
    const lineage: Array<StartingWorld> = [];
    for (let w = world; w && !lineage.includes(w); w = w.from === undefined ? undefined : project.startingWorlds.get(w.from)) lineage.unshift(w);
    const missingParent = lineage[0]?.from;
    const calls: Array<CallRecord> = [];
    const steps: Array<StepResult> = [];
    const skipped: Array<{ readonly step: string; readonly operation: string; readonly file: string }> = [];
    const done = (stopped: string | undefined): JourneyRun => ({ name: journey.name, calls, steps, stopped, ...(skipped.length > 0 ? { skipped } : {}) });
    if (journey.starts !== undefined && !world) return done(`starting world ${journey.starts} is not in blueprint/starting-worlds`);
    if (missingParent !== undefined) return done(`starting world ${lineage[0]!.name} begins from ${missingParent}, which is not in blueprint/starting-worlds`);

    // Each journey has its own people: the same name in two journeys is two people.
    const names = [...new Set([...Object.keys(journey.cast), ...lineage.flatMap((w) => Object.keys(w.cast))])];
    // Cast as anyone: not signed up, so the script can sign them up itself; everyone else is, for real.
    // The keeper is no one to sign up: it is the system's own principal, and it is not built yet (M8.10).
    const keepers = keepersIn(names, [journey.cast, ...lineage.map((w) => w.cast)]);
    const anyone = names.filter((n) => (journey.cast[n] as { readonly kind?: string } | undefined)?.kind === "anyone" && !lineage.some((w) => n in w.cast));
    const wanted = [names.filter((n) => !anyone.includes(n) && !keepers.has(n)).map((n) => `j${index}.${n}`), anyone.map((n) => `j${index}.${n}`)] as const;
    const casting = yield* how === "world"
      ? castPeople(url, ...wanted).pipe(Effect.map((c) => ({ cast: c })))
      : signUpPeople(url, ...wanted).pipe(Effect.map((c) => ({ cast: c })), Effect.catch((problem: string) => Effect.succeed({ problem })));
    if ("problem" in casting) return done(`its people couldn't be made: ${casting.problem}`);
    const cast = casting.cast;
    const people = Object.fromEntries(names.filter((n) => !keepers.has(n)).map((n) => [n, cast[`j${index}.${n}`]!]));
    // A world with a chain gives the journeys its keys and a payee as `s.world.chain` (K7 Q7); a starting world adds to it.
    const env: Record<string, unknown> = { cast: people, ...(device === undefined ? {} : { world: device.given }) };
    const facts = { facts: given ?? doorFacts(url), tableOf: tableOf(project) };

    // Time is declared in the language (M8.09) and built later: a clock step or the keeper's call refuses, never pretends.
    const unbuilt = (call: Call | ClockCall): string | undefined =>
      call.kind === "clock-call" ? "time is not built yet: M8.07 (a step that moves the world's clock)"
      : keepers.has(call.actor) ? "time is not built yet: M8.10 (a call made as the keeper)"
      : undefined;

    const make = (step: string, call: Call, startingWorld = false) =>
      Effect.gen(function* () {
        const operation = nameOfOperation(project, call.operation) ?? "an undeclared operation";
        const resolved = Scripting.resolve(call.payload, env);
        const payload = resolved.value as Record<string, unknown>;
        const who = people[call.actor];
        const person = who?.person ?? "";
        const principal: Principal = who?.person ? { kind: "person", person: who.person, email: who.email } : { kind: "anonymous" };
        const may = yield* mayCall(facts.facts, facts.tableOf, call.operation, payload, principal);
        const model = project.model.operations[operation];
        // A plugin's operation that runs on the device is run in this process, by its `world` entry, never sent to the server.
        const r = device !== undefined && onDevice(model)
          ? yield* callDevice(project, device, operation, call.operation, payload)
          : yield* callOperation(url, facts.facts, operation, call.operation, payload, people[call.actor]?.token ?? "", call.request, empty && startingWorld);
        const id = model?.move && r.status === 200 ? subjectId(model, r.wire, r.body) : undefined;
        const state = id === undefined ? undefined : yield* stateOf(facts.facts, model!.thing, id);
        const record: CallRecord = {
          journey: journey.name, step, actor: call.actor, person, operation, payload: r.wire, status: r.status, body: r.body,
          trace: r.trace, parent: r.parent, mayCall: may, journal: r.journal, stored: typeof state === "string" ? state : undefined,
        };
        calls.push(record);
        if (r.status === 200) {
          env["last"] = yield* Schema.decodeUnknownEffect(call.operation.answerSchema as unknown as Codec)(r.body).pipe(Effect.orElseSucceed(() => r.body));
        }
        return { record, missing: resolved.missing };
      });

    for (const w of lineage) {
      const script = Scripting.script(Object.fromEntries(names.map((n) => [n, Blueprint.signedIn])));
      for (const call of w.makes(script)) {
        const why = unbuilt(call);
        if (why !== undefined) return done(`starting world ${w.name}: ${why}`);
        const { record } = yield* make(`starting world ${w.name}`, call as Call, true);
        if (record.status !== 200) return done(`starting world ${w.name}: ${record.operation} ${record.status === 500 ? "died" : `answered ${record.status}`}: ${show(record.body)}`);
      }
      const gives = Scripting.resolve(w.gives(script), env);
      if (gives.missing.length > 0) return done(`starting world ${w.name} gives nothing at ${gives.missing.join(", ")}`);
      env["world"] = { ...(env["world"] as object | undefined), ...(gives.value as object) };
    }

    for (const step of journey.steps(Scripting.script(journey.cast))) {
      const why = unbuilt(step.call);
      if (why !== undefined) return done(`"${step.title}": ${why}`);
      const called = step.call as Call;
      const gone = project.omitted?.get(called.operation);
      if (gone) { skipped.push({ step: step.title, ...gone }); continue; }
      const { record, missing } = yield* make(step.title, called);
      const checked = yield* runChecks(step.checks, record, env, facts);
      steps.push({
        journey: journey.name, title: step.title, trace: record.trace, spans: checked.spans,
        failures: [...missing.map((m) => `payload: nothing at ${m}`), ...checked.failures],
        findings: [...missing.map((m) => ({ message: `payload: nothing at ${m}` })), ...checked.findings],
      });
    }
    return done(undefined);
  });

export const Journeys: JourneysApi = { load: loadProject, run, databaseFacts, d1Facts };
