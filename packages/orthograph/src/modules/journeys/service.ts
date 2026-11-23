import type { Via } from "#modules/plugins/types.js";
import type { Actor, AnyCall, Assertion, Call, ChecksApi, ClockCall, JourneysApi, RunnerCall, Script, Scripts, TogetherCall, ToolsCall } from "./types.ts";
import { isRef, pathOf, refTo, resolve } from "./internal/refs.ts";

const actorOf = (name: string, via?: Via): Actor =>
  Object.freeze({
    person: refTo(["cast", name, "person"]),
    email: refTo(["cast", name, "email"]),
    password: refTo(["cast", name, "password"]),
    run: (operation: Call["operation"], payload: Call["payload"], options?: { readonly request?: string; readonly due?: string }): Call =>
      Object.freeze({ kind: "call", actor: name, operation, payload, request: options?.request, ...(via === undefined ? {} : { via }), ...(options?.due === undefined ? {} : { due: options.due }) }),
    via: (way: Via) => actorOf(name, way),
    tools: (): ToolsCall => Object.freeze({ kind: "call", actor: name, tools: true as const, ...(via === undefined ? {} : { via }) }),
  }) as Actor;

// The script's own words `world`, `last`, `step`, `runner` and `together` win over a cast member of the same name: the compiler refuses such a cast
// before any script is made (`castClashes`), so nothing is hidden silently. `clock` is both: a cast member may be named it
// (acme's system principal is), and then it is that member with the world's clock controls beside its `run`.
const script = <C extends Record<string, unknown>>(cast: C): Script<any> => {
  const actors = Object.fromEntries(Object.keys(cast).map((name) => [name, actorOf(name)]));
  return Object.freeze({
    ...actors,
    world: refTo(["world"]),
    last: refTo(["last"]),
    clock: Object.freeze({
      ...(Object.hasOwn(actors, "clock") ? actors["clock"] : {}),
      advance: (span: string): ClockCall => Object.freeze({ kind: "clock-call", move: Object.freeze({ advance: span }) }),
      moveTo: (instant: string): ClockCall => Object.freeze({ kind: "clock-call", move: Object.freeze({ moveTo: instant }) }),
      settle: (): ClockCall => Object.freeze({ kind: "clock-call", move: Object.freeze({ advance: "0 seconds" }) }),
    }),
    runner: Object.freeze({
      kill: (signal?: "SIGKILL" | "SIGTERM"): RunnerCall => Object.freeze({ kind: "runner-call", move: "kill", ...(signal === undefined ? {} : { signal }) }),
      start: (): RunnerCall => Object.freeze({ kind: "runner-call", move: "start" }),
      restart: (): RunnerCall => Object.freeze({ kind: "runner-call", move: "restart" }),
    }),
    together: (...calls: ReadonlyArray<Call>): TogetherCall => Object.freeze({ kind: "together-call", calls: Object.freeze([...calls]) }),
    step: (title: string, call: AnyCall, ...checks: ReadonlyArray<Assertion>) => Object.freeze({ kind: "step" as const, title, call, checks }),
  }) as Script<any>;
};

export const Journeys: JourneysApi = {
  journey: (name, spec) => Object.freeze({ kind: "journey", name, cast: spec.cast, starts: spec.starts, steps: spec.steps }),
  startingWorld: (name, spec) =>
    Object.freeze({ kind: "starting-world", name, from: spec.from, cast: spec.cast, makes: spec.makes, gives: spec.gives }),
};

export const Checks: ChecksApi = {
  expect: (pick) => ({
    toMatch: (match) => ({ kind: "expect", pick, match }),
    toBe: (value) => ({ kind: "expect-equal", pick, value }),
    toEqual: (value) => ({ kind: "expect-equal", pick, value }),
  }),
  emits: (event, fields) => ({ kind: "emits", event, fields: fields as Record<string, unknown> }),
  noEvents: () => ({ kind: "no-events" }),
  refuses: (error, fields = {}) => ({ kind: "refuses", error, fields }),
  spans: ({ present = [], absent = [] }) => ({ kind: "spans", present, absent }),
  lacks: (...operations) => ({ kind: "lacks", operations }),
  has: (...operations) => ({ kind: "has", operations }),
};

export const Scripting: Scripts = { script: script as Scripts["script"], isRef, pathOf, resolve };
