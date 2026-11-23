import { Events } from "#modules/events/service.js";
import type { Mount, Option, PluginsApi, ProbeApi, StandApi, Verb } from "./types.ts";
import { firstOption, picked } from "./internal/picked.ts";

const isGroup = (x: unknown): x is object => typeof x === "object" && x !== null && (x as { readonly kind?: unknown }).kind !== "call";

/**
 * An adapter's calls or events, where a name it has none by answers a `MissingCall` or `MissingEvent` that names it
 * (dotted, inside a group), so a mount can say what it asked for. A group of calls is itself a view of the same kind.
 */
const named = (things: object, missing: "missing-call" | "missing-event", prefix = ""): never =>
  new Proxy(things, {
    get: (target, key, receiver) => {
      if (typeof key !== "string" || key in Object.prototype || key === "toJSON" || key === "then") return Reflect.get(target, key, receiver);
      if (!(key in target)) return Object.freeze({ kind: missing, name: `${prefix}${key}` });
      const found: unknown = Reflect.get(target, key, receiver);
      return missing === "missing-call" && isGroup(found) ? named(found, missing, `${prefix}${key}.`) : found;
    },
  }) as never;

const verb = (v: Record<string, unknown>): Verb => Object.freeze({ kind: "verb", ...v }) as Verb;

export const Plugins: PluginsApi = {
  feature: (spec) => Object.freeze({ choices: {} as never, ...spec, kind: "feature" }),
  adapter: (spec) => Object.freeze({ choices: {} as never, calls: {} as never, events: {} as never, ...spec, kind: "adapter" }),
  projection: (spec) => Object.freeze({ choices: {} as never, ...spec, kind: "projection" }),
  choice: (options) => {
    const choice: Record<string, unknown> = { kind: "choice", options: Object.freeze({ ...options }) };
    // Each option points back at its choice, so a pick is checked by identity and never by a written name.
    for (const key of Object.keys(options)) choice[key] = Object.freeze({ kind: "option", key, choice });
    return Object.freeze(choice) as never;
  },
  need: (plugin, spec) => Object.freeze({ kind: "need", plugin, ...(spec?.when ? { when: spec.when } : {}) }),
  incoming: (schema, identity) => Object.freeze({ kind: "event", schema, ...(identity ? { id: identity.id, actor: identity.actor } : {}) }),
  call: (spec) => Object.freeze({ kind: "call", mode: (spec?.mode ?? "promise") as never, errors: spec?.errors ?? [] }),
  setting: {
    one: (value) => Object.freeze({ kind: "setting", shape: "one", value }),
    list: (value, spec) => Object.freeze({ kind: "setting", shape: "list", value, ...(spec?.min !== undefined ? { min: spec.min } : {}) }),
  },
  use: (plugin, verbs) => {
    const calls = "calls" in plugin ? named(plugin.calls, "missing-call") : undefined;
    const events = "calls" in plugin ? named("events" in plugin && plugin.events ? plugin.events : {}, "missing-event") : undefined;
    const view = {
      choices: plugin.choices,
      ...(calls ? { calls } : {}),
      ...(events ? { events } : {}),
      choose: (option: Option) => verb({ verb: "choose", option }),
      include: (...items: ReadonlyArray<unknown>) => verb({ verb: "include", items }),
      narrow: (operation: never, spec: { readonly via: ReadonlyArray<never> }) => verb({ verb: "narrow", operation, via: Object.freeze([...spec.via]) }),
      omit: (operation: never) => verb({ verb: "omit", operation }),
      on: (event: never, operation: never, map: never, options?: never) => verb({ verb: "on", operation, hop: Events.on(event, map, options) }),
    };
    return Object.freeze({ kind: "mount", plugin, verbs: Object.freeze([...(verbs ? verbs(view as never) : [])]), calls: calls ?? {} }) as Mount<typeof plugin>;
  },
};

export const Stand: StandApi = {
  process: (what) => Object.freeze({ kind: "stand-in", how: "process", what }),
  vendor: (what) => Object.freeze({ kind: "stand-in", how: "vendor", what }),
  none: Object.freeze({ kind: "stand-in", how: "none" }),
  command: (mount, command) => (args) => Object.freeze({ kind: "stand-call", mount, command, args }),
  common: (mount) => {
    const of = (command: string) => (args: unknown) => Object.freeze({ kind: "stand-call" as const, mount, command, args });
    return Object.freeze({ seen: of("seen"), hold: of("hold"), held: of("held"), release: of("release"), fail: of("fail"), reset: of("reset") });
  },
};

/** The world's own probe routes, as descriptors (GOAL17-check-harness, calls 3 and 5). A journey imports these; the handlers are in the world's entry only. */
export const Probe: ProbeApi = {
  read: (route) => (args) => Object.freeze({ kind: "world-call", route, method: "GET", args }),
  send: (route) => (args) => Object.freeze({ kind: "world-call", route, method: "POST", args }),
};

/** For the runtime and the compiler: what a mount picked, by identity. */
export const Mounts = { picked, firstOption } as const;
