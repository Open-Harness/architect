// #764: a list as one call sees it. The store is paged to the end, so every row the list matches is known, and each counts as read: the commit carries
// them, and the store refuses it when they moved. This call's own writes are laid over the rows the way `find` lays them over one; then the page is cut.
import { Effect } from "effect";
import type { Thing } from "orthograph";
import { keyOf } from "./unique.ts";
import type { Instance, ListQuery, ListRead, Listed, Store, Stored } from "../types.ts";

/** How many rows one store page asks for while the list pages to the end. */
const PAGE = 100;

/** Does `instance` match `where` and `state`? A field compares by what the store writes; a key the thing has no field for, as text. */
export const matches = (thing: Thing, where: Instance, state: string | undefined, instance: Instance): boolean =>
  Object.entries(where).every(([k, v]) => (k in thing.fields ? keyOf(thing, k, instance[k]) === keyOf(thing, k, v) : String(instance[k]) === String(v)))
  && (state === undefined || instance.state === state);

/** A row's place in the list: a stored row's place in the store (its cursor is the store's), then the call's own inserts in the order made. */
type Rank = readonly [own: number, n: number];
const cursorOf = ([own, n]: Rank) => (own === 0 ? String(n) : `new:${n}`);
const rankOf = (cursor: string): Rank => (cursor.startsWith("new:") ? [1, Number(cursor.slice(4))] : [0, Number(cursor)]);
const earlier = (a: Rank, b: Rank) => (a[0] !== b[0] ? a[0] < b[0] : a[1] < b[1]);

/** The same list asked twice is guarded once, as it was first read. */
const keyOfRead = (thing: Thing, where: Instance, state: string | undefined) =>
  [state ?? "", ...Object.keys(where).sort().map((k) => `${k}=${k in thing.fields ? keyOf(thing, k, where[k]) : String(where[k])}`)].join("\u0000");

export const listerOf = (
  store: Store["Service"],
  find: (thing: Thing, id: string) => Effect.Effect<Instance | undefined>,
  seen: (thing: Thing) => Map<string, Stored | undefined>,
  held: (thing: Thing) => ReadonlyArray<{ readonly id: string; readonly kind: "insert" | "update" }>,
) => {
  const reads = new Map<Thing, Map<string, ListRead>>();

  const list = ({ thing, where, state, order, limit, after }: ListQuery): Effect.Effect<Listed> =>
    Effect.gen(function* () {
      // Every stored row the list matches, oldest first; a row read before keeps the version it was read at.
      const cache = seen(thing);
      const stored: Array<{ readonly id: string; readonly place: number }> = [];
      let cursor: string | undefined;
      do {
        const page = yield* store.list({ thing, where, state, order: "oldest", limit: PAGE, after: cursor });
        page.items.forEach((instance, i) => {
          const id = String(instance["id"]);
          if (cache.get(id) === undefined) cache.set(id, { instance, version: page.rows[i]!.version });
          stored.push({ id, place: page.rows[i]!.place });
        });
        cursor = page.next ?? undefined;
      } while (cursor !== undefined);
      const byThing = reads.get(thing) ?? reads.set(thing, new Map()).get(thing)!;
      const key = keyOfRead(thing, where, state);
      if (!byThing.has(key)) byThing.set(key, { thing, where, state, rows: stored.map(({ id }) => ({ id, version: cache.get(id)!.version })) });

      // The rows as this call leaves them: stored rows it didn't move out, stored rows it moved in (at their own place), then the rows it made.
      const listed = new Set(stored.map((s) => s.id));
      const own = held(thing);
      type Candidate = { readonly id: string; readonly rank: Rank | undefined };
      const candidates: Array<Candidate> = [
        ...stored.map(({ id, place }): Candidate => ({ id, rank: [0, place] })),
        ...own.flatMap((h, n): Array<Candidate> => (h.kind === "insert" ? [{ id: h.id, rank: [1, n] }] : listed.has(h.id) ? [] : [{ id: h.id, rank: undefined }])),
      ];
      const rows: Array<{ readonly instance: Instance; readonly rank: Rank }> = [];
      for (const { id, rank } of candidates) {
        const instance = yield* find(thing, id);
        if (instance === undefined || !matches(thing, where, state, instance)) continue;
        // A stored row this call moved in keeps its own place, which the store says.
        const place = rank === undefined ? yield* store.place(thing, id) : undefined;
        if (rank === undefined && place === undefined) continue;
        rows.push({ instance, rank: rank ?? [0, place!] });
      }
      rows.sort((a, b) => (earlier(a.rank, b.rank) ? -1 : 1));
      if (order === "newest") rows.reverse();

      const from = after === undefined ? undefined : rankOf(after);
      const rest = from === undefined ? rows : rows.filter((r) => (order === "newest" ? earlier(r.rank, from) : earlier(from, r.rank)));
      const page = rest.slice(0, limit);
      return { items: page.map((r) => r.instance), next: rest.length > limit ? cursorOf(page[page.length - 1]!.rank) : null };
    });

  return { list, lists: Effect.sync((): ReadonlyArray<ListRead> => [...reads.values()].flatMap((m) => [...m.values()])) };
};
