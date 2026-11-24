// The four a thing with versions is served: save, restore, get and history.
import { Effect } from "effect";
import { NotAllowed, type AnyErrorClass, type Thing } from "orthograph";
import { Store } from "#modules/records/types.js";
import { contentOf, keep, keyOf, newest, type LooseHandler } from "./keep.ts";

/** How many versions a history reads at most, a page at a time: a policy is saved by hand, so this is far more than anyone keeps. */
const HISTORY = 1000;

export const save = (thing: Thing, stale: AnyErrorClass | undefined): LooseHandler => (payload, context) =>
  keep(thing, stale, payload["base"] as bigint, contentOf(thing, payload), context);

export const restore = (thing: Thing, stale: AnyErrorClass | undefined): LooseHandler => (payload, context) =>
  Effect.gen(function* () {
    const wanted = yield* newest(thing, payload[keyOf(thing)], { revision: payload["revision"] });
    // A version that was never saved is no one's to read: refused as a read of nothing is.
    if (wanted === undefined) return yield* new NotAllowed();
    return yield* keep(thing, stale, payload["base"] as bigint, { ...contentOf(thing, wanted), [keyOf(thing)]: payload[keyOf(thing)] }, context);
  });

export const get = (thing: Thing): LooseHandler => (payload) =>
  Effect.gen(function* () {
    const row = yield* newest(thing, payload[keyOf(thing)], payload["revision"] === undefined ? {} : { revision: payload["revision"] });
    if (row === undefined) return yield* new NotAllowed();
    const { state: _state, ...fields } = row;
    return fields;
  });

export const history = (thing: Thing): LooseHandler => (payload) =>
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
