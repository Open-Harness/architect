// A derived read (GOAL17-derived-reads): the records it looks at, then the pure function that works its answer out. Nothing is
// kept: each call reads the records again, so an answer never drifts from them.
import { Effect, Option, Schema } from "effect";
import { NotAllowed, type AnyDerive, type Look, type Read } from "orthograph";
import { Store, type Instance } from "#modules/records/types.js";
import { ReadNotServed, type ReadAnswer } from "../types.ts";

/** How many roots a page of a derived list reads before it stops, kept or not (GOAL17-derived-reads, section 6). */
export const SCAN = 200;

/** A cursor is the position of the last instance of the page before; anything else is not one this read handed out. */
export const CURSOR = /^[0-9]{1,15}$/;

const isLook = (l: unknown): l is Look => typeof l === "object" && l !== null && (l as { kind?: unknown }).kind === "look";

/** Does the derive look at something a store cannot list (the problems every plugin declares)? Such a read is not served yet. */
export const unserved = (derive: AnyDerive): boolean => Object.values(derive.looks).some((l) => !isLook(l));

/** What each look finds for one root: its newest record or none, or the newest few. Looked up by the field that holds the root's id. */
const found = (derive: AnyDerive, root: Instance) =>
  Effect.gen(function* () {
    const store = yield* Store;
    const out: Record<string, unknown> = {};
    for (const [name, look] of Object.entries(derive.looks)) {
      const l = look as Look;
      const listed = yield* store.list({
        thing: l.thing,
        where: { ...(l.where ?? {}), [l.by.key]: root["id"] },
        state: l.state,
        order: "newest",
        limit: l.take === "newest" ? 1 : l.max,
        after: undefined,
      });
      out[name] = l.take === "newest" ? listed.items[0] : listed.items;
    }
    return out;
  });

/** The root with the fields a derive adds, worked out now. */
export const withAdds = (derive: AnyDerive, root: Instance) =>
  Effect.gen(function* () {
    const looked = yield* found(derive, root);
    const adds = derive.is(root as never, looked as never) as Readonly<Record<string, unknown>>;
    return { ...root, ...adds } as Instance;
  });

const listed = (item: Instance) => ({ ...item, state: item.state ?? "none" });

/** A derived field's value as its schema writes it on the wire, as text; none when the schema doesn't take it (an unset optional). */
const wireOf = (derive: AnyDerive, field: string, value: unknown): string | undefined => {
  const encoded = Schema.encodeUnknownOption((derive.adds as Readonly<Record<string, { readonly schema: unknown }>>)[field]!.schema as Schema.Encoder<unknown>)(value);
  return Option.isSome(encoded) && encoded.value !== undefined ? JSON.stringify(encoded.value) : undefined;
};

/** Does a worked-out row hold the values a read pins, and the filters its caller gave on derived fields? Equal when written alike. */
const matches = (derive: AnyDerive, row: Instance, wanted: Readonly<Record<string, unknown>>) =>
  Object.entries(wanted).every(([k, v]) => {
    const held = wireOf(derive, k, row[k]);
    return held !== undefined && held === wireOf(derive, k, v);
  });

/**
 * A page of a derived list, in steps: a page of roots from the store (stored `where` and `state`), each worked out, those that
 * hold what `only` pins and the filters on derived fields kept. It reads roots until the page is full, the roots end, or `SCAN`
 * roots have been read. So a page can hold fewer rows than `page` and still have a `next`: a caller keeps going until `next` is null.
 */
export const derivedPage = (read: Read<any, any, any>, payload: ReadAnswer) =>
  Effect.gen(function* () {
    const derive = read.derive as AnyDerive;
    const store = yield* Store;
    const { cursor, state, ...filters } = payload as { readonly cursor?: string; readonly state?: string; readonly [field: string]: unknown };
    if (cursor !== undefined && !CURSOR.test(cursor)) return yield* new NotAllowed();
    const pinned = (read.only ?? {}) as Readonly<Record<string, unknown>>;
    const wanted = { ...Object.fromEntries(Object.entries(filters).filter(([k, v]) => read.where.includes(k) && v !== undefined)), ...pinned };
    const storedFields = read.thing.fields as Record<string, unknown>;
    const storedWhere = Object.fromEntries(Object.entries(wanted).filter(([k]) => k in storedFields && k !== "state"));
    const derivedWhere = Object.fromEntries(Object.entries(wanted).filter(([k]) => !(k in storedFields) && k !== "state"));
    const wantedState = (wanted["state"] as string | undefined) ?? state;
    const size = read.page ?? 50;
    const kept: Array<Instance> = [];
    let after = cursor;
    let next: string | null = null;
    let scanned = 0;
    while (kept.length < size && scanned < SCAN) {
      const roots = yield* store.list({
        thing: read.thing, where: storedWhere, state: wantedState, order: read.order ?? "newest",
        limit: Math.min(size - kept.length, SCAN - scanned), after,
      });
      scanned += roots.items.length;
      for (const root of roots.items) {
        const row = yield* withAdds(derive, root);
        if (matches(derive, row, derivedWhere)) kept.push(listed(row));
      }
      next = roots.next;
      after = roots.next ?? undefined;
      if (roots.next === null) break;
    }
    return { items: kept, next } as ReadAnswer;
  });

/** A read by id whose answer adds what a derive works out. */
export const derivedOne = (read: Read<any, any, any>, root: Instance): Effect.Effect<ReadAnswer, never, Store> =>
  Effect.gen(function* () {
    const row = yield* withAdds(read.derive as AnyDerive, root);
    const names = [...read.fields, ...Object.keys(read.derive!.adds)];
    // As a plain read by id: an optional field, the thing's or an add, with no value is left out (#1018).
    return Object.fromEntries(names.map((f) => [f, f === "state" ? (root.state ?? "none") : row[f]]).filter(([, v]) => v !== undefined)) as ReadAnswer;
  });

export const notServed = (name: string) => new ReadNotServed({ read: name, message: `${name}: a derive that looks at problems is not served yet` });
