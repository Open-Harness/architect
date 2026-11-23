// The harness's doors a journey step goes through (GOAL17-check-harness, call 0): the runner of the world prove started, a stand-in's
// own `/_stand/*` routes, and the world's `/_world/*` probe routes. Each answers JSON, and a step reads it with `expect(pick)`.
// A step records what it got as a `CallRecord` with no trace, as the tools list does: nothing here runs an operation.
import { Effect, Option, Schema } from "effect";
import type { RunnerCall, StandCall, WorldCall } from "orthograph";
import type { CallRecord } from "../types.ts";
import type { Harness } from "../types.ts";

const parse = Schema.decodeUnknownOption(Schema.fromJsonString(Schema.Unknown));

/** What a door answered: the status and the body (JSON, or the text of one that is not). A door that cannot be reached is status 0. */
const ask = (url: string, init: RequestInit) =>
  Effect.promise(() =>
    fetch(url, init)
      .then((r) => r.text().then((t) => ({ status: r.status, body: Option.getOrElse(parse(t), () => (t === "" ? null : t)) as unknown })))
      .catch((e: unknown) => ({ status: 0, body: `unreachable: ${e instanceof Error ? e.message : String(e)}` })),
  );

/** `bigint`s travel as text, as an operation's payload does. */
const json = (v: unknown) => JSON.stringify(v, (_, x: unknown) => (typeof x === "bigint" ? x.toString() : x));

/** A door's answer as a record the step's checks read: no operation, no trace, no journal. */
export const recordOf = (journey: string, step: string, operation: string, payload: Readonly<Record<string, unknown>>, status: number, body: unknown): CallRecord =>
  ({ journey, step, actor: "", person: "", operation, payload, status, body, trace: "", parent: "", mayCall: true, journal: [] });

/** `POST <stand-in>/_stand/<command>`: a non-200 is the step's failure, naming the mount, the command and the answer. */
export const standDoor = (harness: Harness | undefined, journey: string, step: string, call: StandCall, args: unknown) =>
  Effect.gen(function* () {
    const stand = harness?.stands?.[call.mount];
    const operation = `${call.mount}.${call.command}`;
    if (stand === undefined) return recordOf(journey, step, operation, {}, 0, `no stand-in is running for the mount "${call.mount}"`);
    const r = yield* ask(`${stand.url}/_stand/${call.command}`, { method: "POST", headers: { "content-type": "application/json" }, body: json(args ?? {}) });
    return recordOf(journey, step, operation, (args ?? {}) as Record<string, unknown>, r.status, r.body);
  });

/** A route under `/_world/`: a GET carries its arguments in the query, a POST in its body. */
export const worldDoor = (url: string, journey: string, step: string, call: WorldCall, args: unknown) =>
  Effect.gen(function* () {
    const values = (args ?? {}) as Record<string, unknown>;
    const query = new URLSearchParams(Object.entries(values).flatMap(([k, v]) => (v === undefined ? [] : [[k, typeof v === "string" ? v : json(v)] as [string, string]])));
    const at = `${url}/_world/${call.route}`;
    const r = call.method === "GET"
      ? yield* ask(query.size === 0 ? at : `${at}?${query.toString()}`, { method: "GET" })
      : yield* ask(at, { method: "POST", headers: { "content-type": "application/json" }, body: json(values) });
    return recordOf(journey, step, `world.${call.route}`, values, r.status, r.body);
  });

/** The runner of a world prove started: a world it did not start has none, and the step says so. */
export const runnerDoor = (harness: Harness | undefined, journey: string, step: string, call: RunnerCall) =>
  Effect.gen(function* () {
    const runner = harness?.runner;
    const operation = `runner.${call.move}`;
    if (runner === undefined) return recordOf(journey, step, operation, {}, 0, `this world has no runner to ${call.move}: prove did not start it`);
    const made = yield* (call.move === "kill" ? runner.kill(call.signal)
      : call.move === "start" ? runner.start
      : Effect.flatMap(runner.kill(call.signal), () => runner.start)).pipe(
      Effect.match({ onFailure: (e) => ({ status: 0, body: e.message as unknown }), onSuccess: (r) => ({ status: 200, body: r as unknown }) }),
    );
    return recordOf(journey, step, operation, {}, made.status, made.body);
  });
