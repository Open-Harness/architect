// Who holds a key: the one instance in a rule's scope with this key, as one call's writes leave it, else as the store has it.
import { Effect } from "effect";
import type { Thing } from "orthograph";
import { holds, inScope, ruleKey, type Rule } from "./unique.ts";
import type { Instance, Store } from "../types.ts";

/** The call's held rows by rule and key, in the order they were written: built once per check, so a lookup is one map read. */
export type HeldIndex = ReadonlyMap<string, ReadonlyMap<string, ReadonlyArray<string>>>;

/** Index every row this call wrote under each rule of its thing: a row is read once, and its key worked out once per rule. */
export const indexHeld = (
  rulesOf: (thing: Thing) => ReadonlyArray<Rule>,
  find: (thing: Thing, id: string) => Effect.Effect<Instance | undefined>,
  held: ReadonlyArray<{ readonly thing: Thing; readonly id: string }>,
): Effect.Effect<HeldIndex> =>
  Effect.gen(function* () {
    const index = new Map<string, Map<string, Array<string>>>();
    for (const { thing, id } of held) {
      const rules = rulesOf(thing);
      if (rules.length === 0) continue;
      const current = yield* find(thing, id);
      if (!current) continue;
      for (const rule of rules) {
        if (!inScope(rule, current)) continue;
        const byKey = index.get(rule.name) ?? index.set(rule.name, new Map()).get(rule.name)!;
        const key = ruleKey(rule, current);
        const ids = byKey.get(key);
        if (ids) ids.push(id); else byKey.set(key, [id]);
      }
    }
    return index;
  });

/**
 * `holder(rule, row, except)`: the instance holding the key `row` fixes under the rule, leaving out the one named `except` (the row asking). The store's
 * candidates are asked for per state of the scope and judged as this call left them; then the rows this call wrote itself (through `index` when given).
 */
export const holderOf = (
  store: Store["Service"],
  find: (thing: Thing, id: string) => Effect.Effect<Instance | undefined>,
  written: (thing: Thing) => ReadonlyArray<string>,
) => (rule: Rule, row: Instance, except: string | undefined, index?: HeldIndex): Effect.Effect<Instance | undefined> =>
  Effect.gen(function* () {
    const key = ruleKey(rule, row);
    const where = Object.fromEntries(rule.fields.map((f) => [f, row[f]]));
    for (const state of rule.scope ?? [undefined]) {
      // One more than asked for, so the row asking can be one of them and another still shows.
      const { items } = yield* store.list({ thing: rule.thing, where, state, order: "oldest", limit: except === undefined ? 1 : 2, after: undefined });
      for (const item of items) {
        if (String(item["id"]) === except) continue;
        const current = yield* find(rule.thing, String(item["id"]));
        if (current && holds(rule, current, key)) return current;
      }
    }
    // With an index (one check's), the rows this call wrote under this key are one read away; without one, every written row is looked at.
    for (const id of index ? (index.get(rule.name)?.get(key) ?? []) : written(rule.thing)) {
      if (id === except) continue;
      const current = yield* find(rule.thing, id);
      if (current && holds(rule, current, key)) return current;
    }
    return undefined;
  });
