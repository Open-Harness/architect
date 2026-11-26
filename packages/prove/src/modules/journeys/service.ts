import { randomBytes } from "node:crypto";
import { Effect, Schema } from "effect";
import type { AnyCall, Operation, Principal, Read, StartingWorld, Thing, Via } from "orthograph";
import { Blueprint } from "orthograph";
import { Scripting } from "orthograph/server";
import type { CallRecord, JourneyRun, JourneysApi, Project, StepResult } from "./types.ts";
import { callDevice, onDevice } from "./internal/device.ts";
import { keepersIn } from "./internal/keepers.ts";
import { loadProject } from "./internal/load.ts";
import { callOperation, callTools, castPeople, doorFacts, makeKey, mayCall, mintCredential, resetWorld, signUpPeople, stateOf } from "./internal/world.ts";
import { databaseFacts } from "./internal/database-facts.ts";
import { d1Facts } from "./internal/d1-facts.ts";
import { subjectId } from "./internal/subject.ts";
import { runChecks, show } from "./internal/checks.ts";
import { WorldClock } from "#modules/world-clock/service.js";

/** A call made to a served operation or the tools list; a step that moves the world's clock goes to the world's clock door instead (M8.07). */
type Doable = Exclude<AnyCall, { readonly kind: "clock-call" }>;

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
    const cast = Object.assign({}, ...lineage.map((w) => w.cast), journey.cast) as Record<string, { readonly kind?: string; readonly service?: unknown } | undefined>;
    // The system and a service are not people: nobody signs them up, and a world mints each one's token (M2-auth, fork 3).
    // The keeper is no one to sign up either: it is the system's own principal, and it is not built yet (M8.10).
    const keepers = keepersIn(names, [...lineage.map((w) => w.cast), journey.cast]);
    const outsiders = names.filter((n) => keepers.has(n) || cast[n]?.kind === "system" || (cast[n]?.kind === "role" && cast[n]?.service !== undefined));
    // Cast as anyone: not signed up, so the script can sign them up itself; everyone else is, for real.
    const anyone = names.filter((n) => cast[n]?.kind === "anyone" && !lineage.some((w) => n in w.cast));
    const wanted = [names.filter((n) => !anyone.includes(n) && !outsiders.includes(n)).map((n) => `j${index}.${n}`), anyone.map((n) => `j${index}.${n}`)] as const;
    // A clock that moves starts again for each journey, on the environment's declared start (G16-journey-clocks call 1): before
    // the cast is made, since the reset ends every session. A real clock is never touched.
    const kind = (yield* WorldClock.read(url))?.kind;
    if (kind === "stepped" || kind === "scaled") {
      const problem = yield* resetWorld(url);
      if (problem !== undefined) return done(`the world's clock couldn't start again for it: the reset answered ${problem}`);
    }
    const casting = yield* how === "world"
      ? castPeople(url, ...wanted).pipe(Effect.map((c) => ({ cast: c })))
      : signUpPeople(url, ...wanted).pipe(Effect.map((c) => ({ cast: c })), Effect.catch((problem: string) => Effect.succeed({ problem })));
    if ("problem" in casting) return done(`its people couldn't be made: ${casting.problem}`);
    const signedUp = casting.cast;
    const people = Object.fromEntries(names.filter((n) => !outsiders.includes(n)).map((n) => [n, signedUp[`j${index}.${n}`]!]));
    // A world with a chain gives the journeys its keys and a payee as `s.world.chain` (K7 Q7); a starting world adds to it.
    const env: Record<string, unknown> = { cast: people, ...(device === undefined ? {} : { world: device.given }) };
    const facts = { facts: given ?? doorFacts(url), tableOf: tableOf(project), nameOf: (op: unknown) => nameOfOperation(project, op as Operation | Read) };
    // `s.clock.now` is what the world's clock reads, from the start and after each step that moves it. A world with no clock door has none.
    const reading = yield* WorldClock.read(url);
    if (reading !== undefined) env["clock"] = { now: reading.now };
    // The keeper's call is not built yet (M8.10): it refuses, never pretends.
    const unbuilt = (call: AnyCall, kept: ReadonlySet<string> = keepers): string | undefined =>
      call.kind !== "clock-call" && kept.has(call.actor) ? "time is not built yet: M8.10 (a call made as the keeper)" : undefined;
    // Each credential the world minted for a cast member's way in, once per journey and again after each clock step.
    const minted = new Map<string, string | undefined>();
    /** A step that moves the world's clock: the world's door answers `{ now, fired }` once it is quiet at the target (M8.07). */
    const moveClock = (step: string, call: Extract<AnyCall, { readonly kind: "clock-call" }>) =>
      Effect.gen(function* () {
        const moved = yield* WorldClock.move(url, call.move);
        const answer = moved.body as { readonly now?: unknown } | null;
        if (moved.status === 200) env["last"] = moved.body;
        // Whatever the status: a refusal that came after the clock had moved (a wake that failed, a world that never went quiet) carries the
        // instant the move reached, and the journey goes on from the world's real time, not from the one it asked at.
        if (typeof answer?.now === "string" && Number.isFinite(Date.parse(answer.now))) env["clock"] = { now: answer.now };
        const record: CallRecord = {
          journey: journey.name, step, actor: "clock", person: "", operation: "clock", payload: { ...call.move }, status: moved.status, body: moved.body,
          trace: randomBytes(16).toString("hex"), parent: randomBytes(8).toString("hex"), mayCall: true, journal: [], clock: true,
        };
        calls.push(record);
        // After every step, whatever it answered and whatever its checks say, the cast signs in again at the world's new time
        // (G16-journey-clocks call 2): the same people, new sessions, and each way in minted again on its next use. On the step,
        // never on a refusal: prove retries nothing. A real environment's people (sign-up) have no world to cast them again.
        if (how === "world" && wanted[0].length > 0) {
          const again = yield* castPeople(url, wanted[0]);
          for (const [name, member] of Object.entries(people)) {
            const token = again[`j${index}.${name}`]?.token;
            if (token !== undefined) people[name] = { ...member, token };
          }
          minted.clear();
        }
        return record;
      });
    /** What a refused clock step says, in the world's own words: a step that asks for a refusal names it, and any other fails. */
    const refusal = (record: CallRecord) => {
      const said = record.body as { readonly _tag?: string; readonly message?: string } | null;
      return `the world refused the clock step: ${said?._tag ?? record.status}${said?.message === undefined ? "" : ` (${said.message})`}`;
    };
    const tokenFor = (actor: string, via: Via | undefined) =>
      Effect.gen(function* () {
        const kind = cast[actor]?.kind;
        if (kind === "system") return (yield* mintCredential(url, { system: true })) ?? "";
        const mount = kind === "role" ? project.mounts?.get(cast[actor]!.service) : undefined;
        if (mount !== undefined) return (yield* mintCredential(url, { service: mount })) ?? "";
        if (via === undefined || via === "session") return people[actor]?.token ?? "";
        const key = `${actor}|${via}`;
        if (!minted.has(key)) {
          const session = people[actor]?.token;
          minted.set(key, how === "world" ? yield* mintCredential(url, { name: `j${index}.${actor}`, via })
            : session !== undefined && (via === "key" || via === "agent") ? yield* makeKey(url, session, via === "agent") : undefined);
        }
        return minted.get(key) ?? "";
      });
    /** Who the call is made as, from the cast member and the way in: what the declaration's `allowed` is read against before the call. */
    const principalOf = (actor: string, via: Via | undefined): Principal => {
      const kind = cast[actor]?.kind;
      if (kind === "system") return { kind: "system" };
      if (kind === "role" && cast[actor]?.service !== undefined) return { kind: "service", mount: project.mounts?.get(cast[actor]!.service) ?? "" };
      const who = people[actor];
      if (!who?.person) return { kind: "anonymous" };
      const named = { person: who.person, email: who.email };
      return via === "agent" ? { kind: "agent", ...named, via: "agent" } : { kind: "person", ...named, via: via ?? "session" };
    };
    const make = (step: string, call: Doable, startingWorld = false) =>
      Effect.gen(function* () {
        if (call.operation === undefined) {
          // The MCP door's tools, listed with the member's own credential: no operation runs, so no trace comes.
          const listed = yield* callTools(url, yield* tokenFor(call.actor, call.via));
          const record: CallRecord = {
            journey: journey.name, step, actor: call.actor, person: people[call.actor]?.person ?? "", operation: "tools", payload: {}, status: listed.status, body: listed.body,
            trace: listed.trace, parent: listed.parent, mayCall: true, journal: [], tools: true,
          };
          calls.push(record);
          // The answer later steps read as `s.last`, as an operation's is: `{ tools }`, not the step before's.
          if (listed.status === 200) env["last"] = listed.body;
          return { record, missing: [] as ReadonlyArray<string> };
        }
        const operation = nameOfOperation(project, call.operation) ?? "an undeclared operation";
        const resolved = Scripting.resolve(call.payload, env);
        const payload = resolved.value as Record<string, unknown>;
        const person = people[call.actor]?.person ?? "";
        const may = yield* mayCall(facts.facts, facts.tableOf, call.operation, payload, principalOf(call.actor, call.via), project.mounts);
        const model = project.model.operations[operation];
        // A plugin's operation that runs on the device is run in this process, by its `world` entry, never sent to the server.
        const r = device !== undefined && onDevice(model)
          ? yield* callDevice(project, device, operation, call.operation, payload)
          : yield* callOperation(url, facts.facts, operation, call.operation, payload, yield* tokenFor(call.actor, call.via), call.request, empty && startingWorld);
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

    for (const [at, w] of lineage.entries()) {
      // A starting world's own cast is what its lineage so far says: a later world or the journey may recast a name.
      const keptHere = keepersIn(names, lineage.slice(0, at + 1).map((x) => x.cast));
      const script = Scripting.script(Object.fromEntries(names.map((n) => [n, Blueprint.signedIn])));
      for (const call of w.makes(script)) {
        if (call.kind === "clock-call") {
          const moved = yield* moveClock(`starting world ${w.name}`, call);
          if (moved.status !== 200) return done(`starting world ${w.name}: ${refusal(moved)}`);
          continue;
        }
        const why = unbuilt(call, keptHere);
        if (why !== undefined) return done(`starting world ${w.name}: ${why}`);
        const { record } = yield* make(`starting world ${w.name}`, call as Doable, true);
        if (record.status !== 200) return done(`starting world ${w.name}: ${record.operation} ${record.status === 500 ? "died" : `answered ${record.status}`}: ${show(record.body)}`);
      }
      const gives = Scripting.resolve(w.gives(script), env);
      if (gives.missing.length > 0) return done(`starting world ${w.name} gives nothing at ${gives.missing.join(", ")}`);
      env["world"] = { ...(env["world"] as object | undefined), ...(gives.value as object) };
    }

    for (const step of journey.steps(Scripting.script(journey.cast))) {
      if (step.call.kind === "clock-call") {
        const record = yield* moveClock(step.title, step.call);
        const checked = yield* runChecks(step.checks, record, env, facts);
        // A refused move that no check asks for is a failure, never a pass by silence.
        const unasked = record.status !== 200 && !step.checks.some((c) => c.kind === "refuses") ? [refusal(record)] : [];
        steps.push({
          journey: journey.name, title: step.title, trace: record.trace, spans: checked.spans,
          failures: [...unasked, ...checked.failures], findings: [...unasked.map((message) => ({ message })), ...checked.findings],
        });
        continue;
      }
      const why = unbuilt(step.call);
      if (why !== undefined) return done(`"${step.title}": ${why}`);
      const called = step.call as Doable;
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
