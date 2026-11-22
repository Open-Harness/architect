import type { Via } from "#modules/plugins/types.js";
import type { Actor, AnyCall, Assertion, Call, ChecksApi, JourneysApi, Script, Scripts, ToolsCall } from "./types.ts";
import { isRef, pathOf, refTo, resolve } from "./internal/refs.ts";

const actorOf = (name: string, via?: Via): Actor =>
  Object.freeze({
    person: refTo(["cast", name, "person"]),
    email: refTo(["cast", name, "email"]),
    password: refTo(["cast", name, "password"]),
    run: (operation: Call["operation"], payload: Call["payload"], options?: { readonly request?: string }): Call =>
      Object.freeze({ kind: "call", actor: name, operation, payload, request: options?.request, ...(via === undefined ? {} : { via }) }),
    via: (way: Via) => actorOf(name, way),
    tools: (): ToolsCall => Object.freeze({ kind: "call", actor: name, tools: true as const, ...(via === undefined ? {} : { via }) }),
  }) as Actor;

const script = <C extends Record<string, unknown>>(cast: C): Script<any> => {
  const actors = Object.fromEntries(Object.keys(cast).map((name) => [name, actorOf(name)]));
  return Object.freeze({
    ...actors,
    world: refTo(["world"]),
    last: refTo(["last"]),
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
