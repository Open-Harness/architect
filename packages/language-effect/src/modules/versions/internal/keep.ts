// What the four share: the newest version of a key, and keeping a new one after it.
import { Clock, Effect } from "effect";
import { acting, type AnyErrorClass, type Thing } from "orthograph";
import { Ids } from "#modules/ids/service.js";
import { Records, Store, type Instance } from "#modules/records/types.js";
import type { VersionContext } from "../types.ts";

/** A handler as written here, failing as its operation declares (a stale save, a read of nothing); `Versions.handler` hands it on typed as the operation's own. */
export type LooseHandler = (payload: Readonly<Record<string, unknown>>, context: VersionContext) => Effect.Effect<Readonly<Record<string, unknown>>, unknown, Records | Store>;

export const keyOf = (thing: Thing) => thing.versions!.key;

/** The newest version of one key, or none. Every save is a new row, so the newest made is the current one. */
export const newest = (thing: Thing, key: unknown, extra: Readonly<Record<string, unknown>> = {}) =>
  Effect.gen(function* () {
    const store = yield* Store;
    const found = yield* store.list({ thing, where: { [keyOf(thing)]: key, ...extra }, state: undefined, order: "newest", limit: 1, after: undefined });
    return found.items[0];
  });

const revisionOf = (row: Instance | undefined): bigint => (row === undefined ? 0n : (row["revision"] as bigint));

/** Who saved: the person, or the person an agent acts for; anyone else (the system) by its kind. */
const byOf = (context: VersionContext): string => acting(context.principal)?.person ?? context.principal.kind;

/** The fields of a version a save carries: the thing's own, but for its id, its revision and the framework's `saved`. */
export const contentOf = (thing: Thing, from: Readonly<Record<string, unknown>>) =>
  Object.fromEntries(Object.keys(thing.fields).filter((k) => !["id", "revision", "saved"].includes(k) && k in from).map((k) => [k, from[k]]));

/**
 * Keep `fields` as the version after the newest, refusing a save made from any version but the newest. The newest row is touched by
 * the same commit, so two saves from one base cannot both land: the one that commits second finds its version moved, and runs again
 * to be refused with the new current one.
 */
export const keep = (thing: Thing, stale: AnyErrorClass | undefined, base: bigint, fields: Readonly<Record<string, unknown>>, context: VersionContext) =>
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
