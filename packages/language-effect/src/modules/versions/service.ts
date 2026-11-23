import { Clock, Effect } from "effect";
import { NotAllowed, acting, type AnyErrorClass, type Thing } from "orthograph";
import { Ids } from "#modules/ids/service.js";
import { Records, Store, type Instance } from "#modules/records/types.js";
import type { VersionContext, VersionHandler, VersionVerb, VersionsApi } from "./types.ts";

/** A handler as written here, failing as its operation declares (a stale save, a read of nothing); `handler` hands it on typed as the operation's own. */
type LooseHandler = (payload: Readonly<Record<string, unknown>>, context: VersionContext) => Effect.Effect<Readonly<Record<string, unknown>>, unknown, Records | Store>;

const VERBS: ReadonlyArray<string> =["save", "get", "history", "restore"];

/** How many versions a history reads at most, a page at a time: a policy is saved by hand, so this is far more than anyone keeps. */
const HISTORY = 1000;

const keyOf = (thing: Thing) => thing.versions!.key;

/** The newest version of one key, or none. Every save is a new row, so the newest made is the current one. */
const newest = (thing: Thing, key: unknown, extra: Readonly<Record<string, unknown>> = {}) =>
  Effect.gen(function* () {
    const store = yield* Store;
    const found = yield* store.list({ thing, where: { [keyOf(thing)]: key, ...extra }, state: undefined, order: "newest", limit: 1, after: undefined });
    return found.items[0];
  });

const revisionOf = (row: Instance | undefined): bigint => (row === undefined ? 0n : (row["revision"] as bigint));

/** Who saved: the person, or the person an agent acts for; anyone else (the system) by its kind. */
const byOf = (context: VersionContext): string => acting(context.principal)?.person ?? context.principal.kind;

/** The fields of a version a save carries: the thing's own, but for its id, its revision and the framework's `saved`. */
const contentOf = (thing: Thing, from: Readonly<Record<string, unknown>>) =>
  Object.fromEntries(Object.keys(thing.fields).filter((k) => !["id", "revision", "saved"].includes(k) && k in from).map((k) => [k, from[k]]));

/**
 * Keep `fields` as the version after `latest`, refusing a save made from any version but the newest. The newest row is touched by
 * the same commit, so two saves from one base cannot both land: the one that commits second finds its version moved, and runs again
 * to be refused with the new current one.
 */
const keep = (thing: Thing, stale: AnyErrorClass | undefined, base: bigint, fields: Readonly<Record<string, unknown>>, context: VersionContext) =>
  Effect.gen(function* () {
    const records = yield* Records;
    const latest = yield* newest(thing, fields[keyOf(thing)]);
    const current = revisionOf(latest);
    if (base !== current) return yield* (stale === undefined ? Effect.die(new Error("a save or restore of a thing with versions needs the refusal of a stale save")) : Effect.fail(new stale({ current })));
    const at = yield* Clock.currentTimeMillis;
    const id = context.id ?? (yield* Ids.of(thing.fields["id"]!) as Effect.Effect<string>);
    if (latest !== undefined) yield* records.update(thing, String(latest["id"]), {});
    yield* records.insert(thing, { ...fields, id, revision: current + 1n, saved: { at, by: byOf(context), from: Number(base) } } as never);
    yield* context.move();
    return { revision: current + 1n };
  });

const save = (thing: Thing, stale: AnyErrorClass | undefined): LooseHandler => (payload, context) =>
  keep(thing, stale, payload["base"] as bigint, contentOf(thing, payload), context);

const restore = (thing: Thing, stale: AnyErrorClass | undefined): LooseHandler => (payload, context) =>
  Effect.gen(function* () {
    const wanted = yield* newest(thing, payload[keyOf(thing)], { revision: payload["revision"] });
    // A version that was never saved is no one's to read: refused as a read of nothing is.
    if (wanted === undefined) return yield* new NotAllowed();
    return yield* keep(thing, stale, payload["base"] as bigint, { ...contentOf(thing, wanted), [keyOf(thing)]: payload[keyOf(thing)] }, context);
  });

const get = (thing: Thing): LooseHandler => (payload) =>
  Effect.gen(function* () {
    const row = yield* newest(thing, payload[keyOf(thing)], payload["revision"] === undefined ? {} : { revision: payload["revision"] });
    if (row === undefined) return yield* new NotAllowed();
    const { state: _state, ...fields } = row;
    return fields;
  });

const history = (thing: Thing): LooseHandler => (payload) =>
  Effect.gen(function* () {
    const store = yield* Store;
    const entries: Array<{ revision: number; at: number; by: string; from: number }> = [];
    let after: string | undefined;
    do {
      const page = yield* store.list({ thing, where: { [keyOf(thing)]: payload[keyOf(thing)] }, state: undefined, order: "newest", limit: 100, after });
      for (const row of page.items) {
        const saved = row["saved"] as { at: number; by: string; from: number } | undefined;
        entries.push({ revision: Number(row["revision"]), at: saved?.at ?? 0, by: saved?.by ?? "", from: saved?.from ?? 0 });
      }
      after = page.next ?? undefined;
    } while (after !== undefined && entries.length < HISTORY);
    return { entries };
  });

/** An operation that declares no move (a thing with versions and no machine) has nothing to move: its handler makes none. */
const unmoved = (moves: boolean, handler: LooseHandler): VersionHandler =>
  (moves ? handler : (payload, context) => handler(payload, { ...context, move: () => Effect.void })) as VersionHandler;

export const Versions: VersionsApi = {
  handler: (verb: VersionVerb, thing: Thing, stale?: AnyErrorClass, moves = true) => unmoved(moves,
    verb === "save" ? save(thing, stale) : verb === "restore" ? restore(thing, stale) : verb === "get" ? get(thing) : history(thing)),
  serves: (thing: Thing, verb: string, payload: ReadonlyArray<string>): verb is VersionVerb =>
    thing.versions !== undefined && VERBS.includes(verb) && payload.includes(thing.versions.key),
};
