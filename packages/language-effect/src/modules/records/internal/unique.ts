// A thing's rules as the stores and the unit read them (G5): which instances are in a rule's scope, what key an instance holds under it, and whether a set
// of rows breaks one.
import { Option, Schema } from "effect";
import type { Thing, Unique } from "orthograph";
import type { Instance, NamedRule } from "../types.ts";

/** One rule: its name, the thing it constrains, its key's fields, and the states it holds in (all of them when absent). */
export interface Rule {
  readonly name: string;
  readonly thing: Thing;
  readonly fields: ReadonlyArray<string>;
  readonly scope: ReadonlyArray<string> | undefined;
  readonly declared: Unique;
}

const ofDeclared = ({ name, rule }: NamedRule): Rule => ({
  name, thing: rule.fields[0].of, fields: rule.fields.map((f) => f.key),
  scope: rule.while?.map((s) => s.key), declared: rule,
});

/** The rules in force: the ones handed in. Read once per store or unit. */
export const rulesOf = (given: ReadonlyArray<NamedRule>) => {
  const declared = given.map(ofDeclared);
  const byThing = new Map<Thing, ReadonlyArray<Rule>>();
  return {
    of: (thing: Thing): ReadonlyArray<Rule> => byThing.get(thing) ?? byThing.set(thing, declared.filter((r) => r.thing === thing)).get(thing)!,
    named: (rule: Unique) => declared.find((r) => r.declared === rule),
  };
};
export type Rules = ReturnType<typeof rulesOf>;

/** Is `instance` in the rule's scope: in one of its `while` states, or any state when it has none. */
export const inScope = (rule: Rule, instance: Instance): boolean =>
  rule.scope === undefined || (instance.state !== undefined && rule.scope.includes(instance.state));

/** A field value as the store writes it: its schema's encoded form, as text, so a struct or an array compares by what it holds. */
export const keyOf = (thing: Thing, field: string, value: unknown): string => {
  const encoded = Schema.encodeUnknownOption(thing.fields[field]!.value.schema as unknown as Schema.Encoder<unknown>)(value);
  return JSON.stringify(Option.isSome(encoded) ? encoded.value : value, (_, v: unknown) => (typeof v === "bigint" ? v.toString() : v));
};

/** The key `instance` holds under the rule: its fields' encoded forms, in the order of the key. */
export const ruleKey = (rule: Rule, instance: Instance): string => rule.fields.map((f) => keyOf(rule.thing, f, instance[f])).join("\u0000");

/** Does `instance` hold the key (as `ruleKey` gave it), within the rule's scope? */
export const holds = (rule: Rule, instance: Instance, key: string): boolean => inScope(rule, instance) && ruleKey(rule, instance) === key;

/** A `findBy` value as the fields it fixes: the value itself for a one-field key, an object of the fields for a composite one. */
export const rowOf = (rule: Rule, value: unknown): Instance =>
  rule.fields.length === 1 ? { [rule.fields[0]!]: value } : (value as Instance);

/** A per-rule count of the keys held within scope, over one thing's rows: a write moves one row's keys, and only those keys are checked. */
export const uniqueIndex = (rules: ReadonlyArray<Rule>, instances: ReadonlyArray<Instance>) => {
  const counts = new Map<string, Map<string, number>>(rules.map((r) => [r.name, new Map()]));
  const keysOf = (instance: Instance) => rules.filter((r) => inScope(r, instance)).map((r) => [r.name, ruleKey(r, instance)] as const);
  const bump = (instance: Instance, by: 1 | -1) => {
    for (const [rule, key] of keysOf(instance)) counts.get(rule)!.set(key, (counts.get(rule)!.get(key) ?? 0) + by);
  };
  for (const instance of instances) bump(instance, 1);
  return {
    /** A row becomes `to` (from `from`, or new): true when it now holds a key another row holds. */
    move: (from: Instance | undefined, to: Instance): boolean => {
      if (from) bump(from, -1);
      bump(to, 1);
      return keysOf(to).some(([rule, key]) => counts.get(rule)!.get(key)! > 1);
    },
  };
};
