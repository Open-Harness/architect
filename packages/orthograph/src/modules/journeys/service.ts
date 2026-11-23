import type { Assertion, Call, ChecksApi, JourneysApi, Script, Scripts } from "./types.ts";
import { isRef, pathOf, refTo, resolve } from "./internal/refs.ts";

const script = <C extends Record<string, unknown>>(cast: C): Script<any> => {
  const actors = Object.fromEntries(
    Object.keys(cast).map((name) => [
      name,
      Object.freeze({
        person: refTo(["cast", name, "person"]),
        account: refTo(["cast", name, "account"]),
        email: refTo(["cast", name, "email"]),
        password: refTo(["cast", name, "password"]),
        run: (operation: Call["operation"], payload: Call["payload"], options?: { readonly request?: string }): Call =>
          Object.freeze({ kind: "call", actor: name, operation, payload, request: options?.request }),
      }),
    ]),
  );
  return Object.freeze({
    ...actors,
    world: refTo(["world"]),
    last: refTo(["last"]),
    step: (title: string, call: Call, ...checks: ReadonlyArray<Assertion>) => Object.freeze({ kind: "step" as const, title, call, checks }),
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
