// A thing with versions (K40 fix 2): one current version per key, every save kept, a stale save refused. The four operations a
// thing like that has, `save`, `get`, `history` and `restore`, are served here, from the thing's own declaration.
import type { Effect } from "effect";
import type { AnyErrorClass, Principal, Thing } from "orthograph";
import type { NamedRule, Records, Store } from "#modules/records/types.js";

/** The four a thing with versions is served: the verbs of its operations. */
export type VersionVerb = "save" | "get" | "history" | "restore";

/** What the wrapper hands every handler, as far as these four read it. */
export interface VersionContext {
  readonly principal: Principal;
  readonly move: (to?: string) => Effect.Effect<void>;
  readonly id: string | undefined;
}

/**
 * A handler of one of the four: the payload its operation declares, an answer or the stale-save refusal, and the services the store
 * gives. Written for any thing, so what it takes and answers is the declaration's own, which only the generated server knows.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type VersionHandler = (payload: any, context: any) => Effect.Effect<any, never, Records | Store>;

export interface VersionsApi {
  /** The rule a thing with versions holds beside its own (one row per revision of a key): the runtime and the store enforce it, so two first saves cannot both land. */
  readonly rulesOf: (name: string, thing: Thing) => ReadonlyArray<NamedRule>;
  /**
   * The handler of one verb for a thing with `versions`. `stale` is the refusal a save or restore made from an old version
   * answers with (its one field is `current`): the operation's own error class, which the compiler finds by that shape.
   */
  readonly handler: (verb: VersionVerb, thing: Thing, stale?: AnyErrorClass, moves?: boolean) => VersionHandler;
  /** Is this operation one of the four of a thing with versions: its verb is one of them, and the thing's key is a field of its payload? */
  readonly serves: (thing: Thing, verb: string, payload: ReadonlyArray<string>) => verb is VersionVerb;
}
