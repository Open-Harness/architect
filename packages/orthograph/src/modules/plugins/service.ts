import type { Mount, Option, PluginsApi, StandApi, Verb } from "./types.ts";
import { firstOption, picked } from "./internal/picked.ts";

/** An adapter's calls, where a name it has no call by answers a `MissingCall` that names it, so a mount can say what it asked for. */
const callsOf = (calls: object): never =>
  new Proxy(calls, {
    get: (target, key, receiver) =>
      typeof key !== "string" || key in target || key in Object.prototype || key === "toJSON" || key === "then"
        ? Reflect.get(target, key, receiver)
        : Object.freeze({ kind: "missing-call", name: key }),
  }) as never;

const verb = (v: Record<string, unknown>): Verb => Object.freeze({ kind: "verb", ...v }) as Verb;

export const Plugins: PluginsApi = {
  feature: (spec) => Object.freeze({ choices: {} as never, ...spec, kind: "feature" }),
  adapter: (spec) => Object.freeze({ choices: {} as never, calls: {} as never, ...spec, kind: "adapter" }),
  projection: (spec) => Object.freeze({ choices: {} as never, ...spec, kind: "projection" }),
  choice: (options) => {
    const choice: Record<string, unknown> = { kind: "choice", options: Object.freeze({ ...options }) };
    // Each option points back at its choice, so a pick is checked by identity and never by a written name.
    for (const key of Object.keys(options)) choice[key] = Object.freeze({ kind: "option", key, choice });
    return Object.freeze(choice) as never;
  },
  need: (plugin, spec) => Object.freeze({ kind: "need", plugin, ...(spec?.when ? { when: spec.when } : {}) }),
  call: (spec) => Object.freeze({ kind: "call", mode: (spec?.mode ?? "promise") as never, errors: spec?.errors ?? [] }),
  setting: {
    one: (value) => Object.freeze({ kind: "setting", shape: "one", value }),
    list: (value, spec) => Object.freeze({ kind: "setting", shape: "list", value, ...(spec?.min !== undefined ? { min: spec.min } : {}) }),
  },
  use: (plugin, verbs) => {
    const calls = "calls" in plugin ? callsOf(plugin.calls) : undefined;
    const view = {
      choices: plugin.choices,
      ...(calls ? { calls } : {}),
      choose: (option: Option) => verb({ verb: "choose", option }),
      include: (...items: ReadonlyArray<unknown>) => verb({ verb: "include", items }),
      narrow: (operation: never, spec: { readonly via: ReadonlyArray<never> }) => verb({ verb: "narrow", operation, via: Object.freeze([...spec.via]) }),
      omit: (operation: never) => verb({ verb: "omit", operation }),
    };
    return Object.freeze({ kind: "mount", plugin, verbs: Object.freeze([...(verbs ? verbs(view as never) : [])]), calls: calls ?? {} }) as Mount<typeof plugin>;
  },
};

export const Stand: StandApi = {
  process: (what) => Object.freeze({ kind: "stand-in", how: "process", what }),
  vendor: (what) => Object.freeze({ kind: "stand-in", how: "vendor", what }),
  none: Object.freeze({ kind: "stand-in", how: "none" }),
};

/** For the runtime and the compiler: what a mount picked, by identity. */
export const Mounts = { picked, firstOption } as const;
