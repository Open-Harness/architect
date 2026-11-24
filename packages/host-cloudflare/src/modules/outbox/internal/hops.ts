// The hops a blueprint declares, read from the same declarations the Worker serves: each operation's `on:` list, and each mount's `on` verbs.
import type { On } from "orthograph";
import { EventNames } from "orthograph/server";
import type { Hop } from "../types.ts";

type Verb = { readonly kind?: string; readonly verb?: string; readonly operation?: unknown; readonly hop?: On };

/** `declared` pairs each served operation's name with its declaration; a mount's hop names its operation by that same declaration. */
export const hopsOf = (declared: ReadonlyArray<readonly [string, unknown]>, mounts: ReadonlyArray<{ readonly verbs: ReadonlyArray<unknown> }>): ReadonlyArray<Hop> => {
  const nameOf = new Map<unknown, string>(declared.map(([name, op]) => [op, name]));
  const made = (on: On, to: string | undefined): ReadonlyArray<Hop> => {
    const name = EventNames.nameOf(on.event);
    if (name === undefined || to === undefined) return [];
    const then = on.onRefused === undefined ? undefined : nameOf.get(on.onRefused.then);
    return [{ name, event: on.event, to, map: on.map as Hop["map"], onRefused: on.onRefused === undefined || then === undefined ? undefined : { error: on.onRefused.error, then } }];
  };
  const own = declared.flatMap(([name, op]) => ((op as { readonly on?: ReadonlyArray<On> }).on ?? []).flatMap((on) => made(on, name)));
  const mounted = mounts.flatMap((m) => (m.verbs as ReadonlyArray<Verb>).flatMap((v) => (v.verb === "on" && v.hop !== undefined ? made(v.hop, nameOf.get(v.operation)) : [])));
  return [...own, ...mounted];
};
