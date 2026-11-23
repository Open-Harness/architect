import { Effect, Layer } from "effect";
import type { Thing } from "orthograph";
import type { Entry } from "#modules/journal/types.js";
import { Journal } from "#modules/journal/types.js";
import { journalOf } from "#modules/journal/service.js";
import { Records, Store, type Instance, type NamedRule, type UnitApi } from "./types.ts";
import { makeUnit } from "./internal/unit.ts";
import { keyOf, rulesOf, uniqueIndex } from "./internal/unique.ts";

export const Unit: UnitApi = { make: makeUnit };

/** A store and journal held in memory, for tests: the same versions and the same all-or-nothing commit as a host's. */
export const storeMemory = (initial: ReadonlyArray<readonly [Thing, Instance]> = [], given: ReadonlyArray<NamedRule> = []) => {
  const rules = rulesOf(given);
  const rows = initial.map(([thing, instance]) => ({ thing, instance, version: 0 }));
  const entries: Array<Entry> = [];
  const requests = new Map<string, string>();
  const at = (thing: Thing, id: unknown) => rows.findIndex((r) => r.thing === thing && r.instance["id"] === id);
  const store = Store.of({
    rules: given,
    find: (thing, id) => Effect.sync(() => {
      const r = rows[at(thing, id)];
      return r && { instance: r.instance, version: r.version };
    }),
    list: ({ thing, where, state, order, limit, after }) => Effect.sync(() => {
      // A row's place in `rows` is the order it was made in, and its cursor.
      const ordered = rows.flatMap((r, i) => (r.thing === thing ? [{ r, i }] : []));
      const matching = (order === "newest" ? ordered.reverse() : ordered).filter(({ r, i }) =>
        Object.entries(where).every(([k, v]) => (k in thing.fields ? keyOf(thing, k, r.instance[k]) === keyOf(thing, k, v) : String(r.instance[k]) === String(v)))
        && (state === undefined || r.instance.state === state)
        && (after === undefined || (order === "newest" ? i < Number(after) : i > Number(after))));
      const page = matching.slice(0, limit);
      return { items: page.map(({ r }) => r.instance), next: matching.length > limit ? String(page[page.length - 1]!.i) : null };
    }),
    answered: (key) => Effect.sync(() => requests.get(key)),
    commit: ({ writes, entries: events, request }) =>
      Effect.sync(() => {
        if (request && requests.has(request.key)) return "conflict" as const;
        // One write at a time, checked after each, as D1 checks its index statement by statement: on a copy, so a refusal writes none of it.
        const next = rows.map((r) => ({ ...r }));
        const index = (thing: Thing, id: unknown) => next.findIndex((r) => r.thing === thing && r.instance["id"] === id);
        const keys = new Map<Thing, ReturnType<typeof uniqueIndex>>();
        for (const w of writes) {
          if (!keys.has(w.thing)) keys.set(w.thing, uniqueIndex(rules.of(w.thing), next.filter((r) => r.thing === w.thing).map((r) => r.instance)));
          if (w.kind === "insert") {
            const instance = { ...w.fields, ...(w.state ? { state: w.state } : {}) };
            next.push({ thing: w.thing, instance, version: 0 });
            if (keys.get(w.thing)!.move(undefined, instance)) return "conflict" as const;
          } else {
            const r = next[index(w.thing, w.id)];
            if (r === undefined || r.version !== w.version) return "conflict" as const;
            const from = r.instance;
            r.instance = { ...from, ...w.changes, ...(w.state ? { state: w.state } : {}) };
            r.version += 1;
            if (keys.get(w.thing)!.move(from, r.instance)) return "conflict" as const;
          }
        }
        // Nothing is spread into arguments (a big store would overflow the stack), and the answer is kept last: a commit that throws leaves nothing behind.
        const journalled = Array.from(events);
        rows.length = 0;
        for (const r of next) rows.push(r);
        for (const e of journalled) entries.push(e);
        if (request) requests.set(request.key, request.answer);
        return "committed" as const;
      }),
  });
  const journal = journalOf(entries);
  return { entries, rows, layer: Layer.mergeAll(Layer.succeed(Store, store), Layer.succeed(Journal, journal)) };
};

/** `Records` over an in-memory store, outside any call: for tests of roles and reads. */
export const recordsMemory = (initial: ReadonlyArray<readonly [Thing, Instance]>) =>
  Layer.effect(Records, Effect.gen(function* () {
    const store = yield* Store;
    return (yield* makeUnit(store)).records;
  })).pipe(Layer.provide(storeMemory(initial).layer));

/** The rules a `invariants.ts` module exports, each named `<thing>.<export>` (the thing's name, as the model has it): what a host's store and the unit enforce. */
export const invariantsIn = (thing: string, module: Readonly<Record<string, unknown>>): ReadonlyArray<NamedRule> =>
  Object.entries(module).flatMap(([name, rule]) =>
    typeof rule === "object" && rule !== null && (rule as { kind?: unknown }).kind === "invariant" ? [{ name: `${thing}.${name}`, rule: rule as NamedRule["rule"] }] : []);

/** The one thing a `thing.ts` module exports, whatever its export is called. */
export const thingIn = (module: Readonly<Record<string, unknown>>): Thing => {
  const found = Object.values(module).find((x) => typeof x === "object" && x !== null && (x as { kind?: unknown }).kind === "thing");
  return found as Thing;
};
