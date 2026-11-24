// One attempt at a call: reads go to the store and their versions are remembered; writes are held back, merged per
// instance, until the call commits them with its move.
import { Effect } from "effect";
import type { Thing, Unique } from "orthograph";
import { orderSteps, type Step } from "./order.ts";
import { holderOf, indexHeld } from "./holder.ts";
import { listerOf } from "./list.ts";
import { inScope, rowOf, ruleKey, rulesOf } from "./unique.ts";
import type { Instance, NamedRule, Store, Unit, Violation, Write } from "../types.ts";

type Held = { thing: Thing; id: string; kind: "insert" | "update"; version: number; fields: Record<string, unknown>; state: string | undefined };

export const makeUnit = (store: Store["Service"], given?: ReadonlyArray<NamedRule>): Effect.Effect<Unit> =>
  Effect.sync(() => {
    const rules = rulesOf(given ?? store.rules ?? []);
    const read = new Map<Thing, Map<string, { instance: Instance; version: number } | undefined>>();
    const held: Array<Held> = [];
    const heldBy = new Map<Thing, Map<string, Held>>();
    const heldFor = (thing: Thing, id: string) => heldBy.get(thing)?.get(id);
    const hold = (h: Held) => {
      held.push(h);
      const ids = heldBy.get(h.thing) ?? heldBy.set(h.thing, new Map()).get(h.thing)!;
      if (!ids.has(h.id)) ids.set(h.id, h);
    };
    const seen = (thing: Thing) => read.get(thing) ?? read.set(thing, new Map()).get(thing)!;

    const load = (thing: Thing, id: string) =>
      Effect.gen(function* () {
        const cache = seen(thing);
        if (!cache.has(id)) cache.set(id, yield* store.find(thing, id));
        return cache.get(id);
      });

    const find = (thing: Thing, id: string) =>
      Effect.gen(function* () {
        const stored = yield* load(thing, id);
        const h = heldFor(thing, id);
        if (!h) return stored?.instance;
        const base = h.kind === "insert" ? {} : (stored?.instance ?? {});
        return { ...base, ...h.fields, ...(h.state !== undefined ? { state: h.state } : {}) } as Instance;
      });
    const lister = listerOf(store, find, seen, (thing) => held.filter((h) => h.thing === thing));
    const holder = holderOf(store, find, (thing) => held.filter((h) => h.thing === thing).map((h) => h.id));

    /** `findBy(rule, value)` (G5): the holder of a key, as this call's own writes left it, else the store's. */
    const findBy = (rule: Unique, value: unknown) =>
      Effect.gen(function* () {
        const named = rules.named(rule);
        if (!named) return yield* Effect.die(new Error("findBy(rule, value): that rule is not one this store holds"));
        return yield* holder(named, rowOf(named, value), undefined);
      });

    const change = (thing: Thing, id: string, fields: Record<string, unknown>, state: string | undefined) =>
      Effect.gen(function* () {
        const h = heldFor(thing, id);
        if (h) {
          Object.assign(h.fields, fields);
          if (state !== undefined) h.state = state;
          return;
        }
        const stored = yield* load(thing, id);
        if (!stored) return yield* Effect.die(new Error(`${id} can't change: it was never stored`));
        hold({ thing, id, kind: "update", version: stored.version, fields: { ...fields }, state });
      });

    /** Each held row with the row as the call found it and as it leaves it. */
    const stepsOf = (): ReadonlyArray<Step> => held.map((h): Step => {
      const stored = read.get(h.thing)?.get(h.id)?.instance;
      const base = h.kind === "insert" ? {} : (stored ?? {});
      return {
        write: h.kind === "insert"
          ? { kind: "insert", thing: h.thing, fields: h.fields, state: h.state }
          : { kind: "update", thing: h.thing, id: h.id, version: h.version, changes: h.fields, state: h.state },
        before: h.kind === "insert" ? undefined : stored,
        after: { ...base, ...h.fields, ...(h.state !== undefined ? { state: h.state } : {}) } as Instance,
      };
    });

    /** The first rule a row breaks by taking a key someone else holds. A row that already held its key (in scope, same key) takes nothing. */
    const check = Effect.gen(function* () {
      const steps = stepsOf();
      const index = yield* indexHeld(rules.of, find, held);
      // The call's own rows first (G5 section 6.2): two of them under one key is the handler's bug, whoever else holds it in the store.
      const seenKeys = new Map<Thing, Set<string>>();
      for (const { write, after } of steps) {
        for (const rule of rules.of(write.thing)) {
          if (!inScope(rule, after)) continue;
          const slot = `${rule.name}\u0000${ruleKey(rule, after)}`;
          const seen = seenKeys.get(write.thing) ?? seenKeys.set(write.thing, new Set()).get(write.thing)!;
          if (seen.has(slot)) return { rule: rule.name, refuse: rule.declared?.refuse, row: after, own: true } satisfies Violation;
          seen.add(slot);
        }
      }
      for (const { write, before, after } of steps) {
        for (const rule of rules.of(write.thing)) {
          if (!inScope(rule, after)) continue;
          const key = ruleKey(rule, after);
          if (before !== undefined && inScope(rule, before) && ruleKey(rule, before) === key) continue;
          const id = String(after["id"]);
          const other = yield* holder(rule, after, id, index);
          if (other !== undefined) {
            return { rule: rule.name, refuse: rule.declared?.refuse, row: after, own: heldFor(rule.thing, String(other["id"])) !== undefined, retry: rule.declared?.retry === true } satisfies Violation;
          }
        }
      }
      return undefined;
    });

    return {
      records: {
        find,
        findBy: findBy as Unit["records"]["findBy"],
        list: lister.list,
        insert: (thing, fields, state) =>
          Effect.sync(() => {
            const id = String((fields as Record<string, unknown>)["id"]);
            hold({ thing, id, kind: "insert", version: 0, fields: { ...(fields as Record<string, unknown>) }, state });
          }),
        update: (thing, id, changes, state) => change(thing, id, changes as Record<string, unknown>, state),
      },
      read: find,
      setState: (thing, id, state) => change(thing, id, {}, state),
      check,
      lists: lister.lists,
      writes: Effect.suspend(() => {
        const ordered = orderSteps(stepsOf(), rules);
        if (!Array.isArray(ordered)) {
          const { rule, why } = ordered as Exclude<typeof ordered, ReadonlyArray<Step>>;
          return Effect.die(new Error(why === "clash"
            ? `this call's own rows hold one value of the unique rule ${rule}: that is the handler's bug, not a race`
            : `this call's writes cannot be put in an order: each must go after another, over the unique rule ${rule}`));
        }
        return Effect.succeed((ordered as ReadonlyArray<Step>).map((s): Write => s.write));
      }),
    };
  });
