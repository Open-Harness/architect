import { Effect } from "effect";
import type { AnyErrorClass, Thing } from "orthograph";
import { get, history, restore, save } from "./internal/handlers.ts";
import type { LooseHandler } from "./internal/keep.ts";
import type { VersionHandler, VersionVerb, VersionsApi } from "./types.ts";

const VERBS: ReadonlyArray<string> = ["save", "get", "history", "restore"];

/** An operation that declares no move (a thing with versions and no machine) has nothing to move: its handler makes none. */
const unmoved = (moves: boolean, handler: LooseHandler): VersionHandler =>
  (moves ? handler : (payload, context) => handler(payload, { ...context, move: () => Effect.void })) as VersionHandler;

export const Versions: VersionsApi = {
  handler: (verb: VersionVerb, thing: Thing, stale?: AnyErrorClass, moves = true) =>
    unmoved(moves, verb === "save" ? save(thing, stale) : verb === "restore" ? restore(thing, stale) : verb === "get" ? get(thing) : history(thing)),
  serves: (thing: Thing, verb: string, payload: ReadonlyArray<string>): verb is VersionVerb =>
    thing.versions !== undefined && VERBS.includes(verb) && payload.includes(thing.versions.key),
};
