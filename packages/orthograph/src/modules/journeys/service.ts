import type { Assertion, Call, ChecksApi, ClockCall, JourneysApi, Script, Scripts } from "./types.ts";
import { isRef, pathOf, refTo, resolve } from "./internal/refs.ts";

const script = <C extends Record<string, unknown>>(cast: C): Script<any> => {
  const actors = Object.fromEntries(
    Object.keys(cast).map((name) => [
      name,
      Object.freeze({
        person: refTo(["cast", name, "person"]),
        email: refTo(["cast", name, "email"]),
        password: refTo(["cast", name, "password"]),
        run: (operation: Call["operation"], payload: Call["payload"], options?: { readonly request?: string; readonly due?: string }): Call =>
          Object.freeze({ kind: "call", actor: name, operation, payload, request: options?.request, ...(options?.due === undefined ? {} : { due: options.due }) }),
      }),
    ]),
  );
  return Object.freeze({
    ...actors,
    world: refTo(["world"]),
    last: refTo(["last"]),
    clock: Object.freeze({
      advance: (span: string): ClockCall => Object.freeze({ kind: "clock-call", move: Object.freeze({ advance: span }) }),
      moveTo: (instant: string): ClockCall => Object.freeze({ kind: "clock-call", move: Object.freeze({ moveTo: instant }) }),
    }),
    step: (title: string, call: Call | ClockCall,...checks: ReadonlyArray<Assertion>) => Object.freeze({ kind: "step" as const, title, call, checks }),
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
};

export const Scripting: Scripts = { script: script as Scripts["script"], isRef, pathOf, resolve };
