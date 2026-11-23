// What check 28 (ST1.22) judges the portal with: a wire for Plugged In that carries its rules the way G5 section 3 says the model does
// (`things.<t>.invariants`, `operations.<op>.invariants` from refusal to rule, `operations.<op>.breaks`), and, in `rules-judge.ts`, a judge that reads a served portal's pages and says what is
// wrong with them. The rules are Plugged In's three one-line `unique` entries as they stand (until ST1.19): their fields and states are READ from
// the wire's `unique`; only their names, their refusals and the one description are the check's, and they reach the portal through the wire alone. From ST1.19 the wire carries
// the rules itself and no `unique`: they are then read back out of `invariants`, and built the same way (see `withRules`).
// S-31 (design/decisions/S31-breaks.md): each operation also carries `breaks`, every rule it can break. The fixture states that list itself (`BREAKS`, written out by hand), and a wire that carries the compiler's own `breaks` is held to it (`Built.compiled`): drift between the compiler and the fixture fails. A planted variant
// then replaces the list (`PLANTED_BREAKS`), so only a portal that READS `breaks` passes both variants.
import { Wire } from "@orthograph/portal";

export interface Rule { readonly thing: string; readonly name: string; readonly fields: ReadonlyArray<string>; readonly while: ReadonlyArray<string>; readonly refuse?: string; readonly description?: string }
export interface Raw { model: { things: Record<string, { unique?: Record<string, { while?: ReadonlyArray<string> }>; invariants?: Record<string, unknown>; errors?: Record<string, unknown> }>; operations: Record<string, { thing: string; errors: Array<string>; refusals: Array<string>; invariants?: Record<string, string>; breaks?: Array<string>; move?: unknown }> }; digest?: string }

/** How a variant names the three rules, by `thing.field`; `while` overrides what the wire's `unique` says (a planted change). */
export type Naming = Readonly<Record<string, { readonly name: string; readonly refuse?: string; readonly description?: string; readonly while?: ReadonlyArray<string> }>>;
/** Plugged In's rules as they stand: names from G5, the owner rule's own words. */
export const AS_THEY_STAND: Naming = {
  "handle.name": { name: "oneHolderPerName", refuse: "HandleTaken" },
  "handle.owner": { name: "oneNamePerPerson", refuse: "HandleAlreadyOwned", description: "you already hold a name" },
  "profile.handle": { name: "onePagePerHandle" },
};
/** The same rules renamed and re-worded, with one scope changed and the one-liners gone: a portal that wrote Plugged In's sentences in will not survive it. */
export const PLANTED: Naming = {
  "handle.name": { name: "nameHasOneHolder", refuse: "HandleTaken", description: "planted words 7f31: nobody else may hold it", while: ["claimed", "released"] },
  "handle.owner": { name: "ownerHoldsOneName", refuse: "HandleAlreadyOwned" },
  "profile.handle": { name: "pageIsUnique" },
};

/**
 * What each operation of Plugged In can break, by the rule's `thing.field`, written out by hand (an operation not named breaks nothing): `handle.claim` its two rules and, with `writes: [Profile]`,
 * the page rule, which owns no refusal. `profile.get` is a read and declares `writes: []`, so it breaks nothing (S31-breaks.md, amendment to G5 section 3). Not derived from the wire's `invariants`.
 */
const BREAKS: Readonly<Record<string, ReadonlyArray<string>>> = { "handle.claim": ["handle.name", "handle.owner", "profile.handle"] };

/**
 * A `breaks` that is NOT what the compiler says, for the planted variant, by operation and the rule's `thing.field`; an operation it does not name breaks nothing. It moves the page rule
 * off `handle.claim` and onto three operations that attach no refusal at all (`handle.resolve` and `link.add`, whose things have machines, and `profile.get`, whose thing has none). A portal that writes in "claim:
 * every rule of handle and profile, everything else: none", or shows the stop only when an operation has refusals, passes the real list and fails this one; only a portal that reads
 * `breaks` passes both. Every refusal an operation attaches stays among its `breaks`, as the compiler guarantees.
 */
export const PLANTED_BREAKS: Readonly<Record<string, ReadonlyArray<string>>> = {
  "handle.claim": ["handle.name", "handle.owner"],
  "handle.resolve": ["profile.handle"],
  "link.add": ["profile.handle"],
  "profile.get": ["profile.handle"], // a thing with no machine: a portal that shows no stop there passes the real list and fails this one
};

/** The wire with the rules, and the rules read back out of it. It is the signed JSON as a Worker would hold it, not a decoded one: `Wire.decode` drops what its schema does not name, and ST1.17 adds `invariants` to it. `keepUnique`: the one-liners stay (as they stand) or go (a wire from after ST1.20). */
export interface Built {
  readonly wire: Raw;
  readonly rules: ReadonlyArray<Rule>;
  /** What the fixture says each operation breaks (full rule names, this variant's, sorted): the compiler's list, as the fixture states it. */
  readonly truth: Readonly<Record<string, ReadonlyArray<string>>>;
  /** The wire's own `breaks` (the compiler's answer), mapped through this variant's names and sorted; `null` while the wire does not carry one on every operation. */
  readonly compiled: Readonly<Record<string, ReadonlyArray<string>>> | null;
}

/** `planted`: a `breaks` that replaces the true one on the wire the portal gets (`PLANTED_BREAKS`); `truth` and `compiled` stay the compiler's. */
export const withRules = async (pluggedIn: unknown, naming: Naming, keepUnique: boolean, planted?: Readonly<Record<string, ReadonlyArray<string>>>): Promise<Built> => {
  const { digest: _, ...unsigned } = structuredClone(pluggedIn) as Raw;
  const rules: Array<Rule> = [];
  // The wire's own `breaks` names rules as the compiler does, `<thing>.<rule>`; the rule's `thing.field` is how this variant renames it. Read before the loop clears `invariants`.
  const keyOf = (full: string): string => { const [thing, rule] = full.split("."); const r = (unsigned.model.things[thing!]?.invariants ?? {})[rule!] as { readonly fields: ReadonlyArray<string> } | undefined; if (r === undefined) throw new Error(`the wire's breaks names ${full}, which is no rule of its things`); return `${thing}.${r.fields[0]}`; };
  // As the wire has it: an operation without a list (or with something else) makes the whole answer `null`; a name twice stays twice, so the check sees it.
  const compiledKeys = Object.values(unsigned.model.operations).every((op) => Array.isArray(op.breaks))
    ? Object.fromEntries(Object.entries(unsigned.model.operations).map(([name, op]) => [name, op.breaks!.map(keyOf)]))
    : null;
  for (const [thing, t] of Object.entries(unsigned.model.things)) {
    // From ST1.19 the wire carries Plugged In's rules itself (`invariants`) and no `unique`: each is read back as the one-liner it replaced (its first key field and its scope) and cleared, with the
    // operations' maps to it, so that `naming` builds every variant the same way, from the wire's own fields and scopes.
    const given = Object.entries(t.unique ?? {});
    const declared = Object.values((t.invariants ?? {}) as Record<string, { readonly fields: ReadonlyArray<string>; readonly while?: ReadonlyArray<string> }>);
    const lifted = given.length > 0 ? [] : declared.map((i): [string, { while?: ReadonlyArray<string> }] => [i.fields[0]!, i.while === undefined ? {} : { while: i.while }]);
    if (lifted.length > 0) {
      delete t.invariants;
      for (const op of Object.values(unsigned.model.operations)) if (op.thing === thing) delete op.invariants;
    }
    for (const [field, u] of [...given, ...lifted]) {
      const n = naming[`${thing}.${field}`];
      if (n === undefined) throw new Error(`no name for the rule on ${thing}.${field}`);
      const rule: Rule = { thing, name: n.name, fields: [field], while: n.while ?? u.while ?? [], ...(n.refuse === undefined ? {} : { refuse: n.refuse }), ...(n.description === undefined ? {} : { description: n.description }) };
      rules.push(rule);
      t.invariants = { ...t.invariants, [rule.name]: { kind: "unique", fields: rule.fields, while: rule.while, ...(rule.refuse === undefined ? {} : { refuse: rule.refuse }), ...(rule.description === undefined ? {} : { description: rule.description }) } };
      if (rule.refuse !== undefined) for (const op of Object.values(unsigned.model.operations)) {
        if (op.thing !== thing || !op.refusals.includes(rule.refuse)) continue;
        op.invariants = { ...op.invariants, [rule.refuse]: `${thing}.${rule.name}` };
        op.errors = op.errors.filter((e) => e !== rule.refuse);
      }
    }
    if (!keepUnique) delete t.unique;
  }
  // S-31: every operation carries `breaks`, the way the compiler's `breakersOf` works it out: the full name of each rule it can break, refusal or not (G5 section 3;
  // design/decisions/S31-breaks.md). The rules with a refusal are the ones `invariants` already maps; the rules with none are named here, from what Plugged In's blueprint
  // does (handle.claim makes a profile: `writes: [Profile]`). That is the fixture's own list (`truth`); the wire's own (`compiled`) is held to it by the caller, and the planted
  // variant replaces it on the wire the portal gets.
  const fullName = (key: string) => { const [thing, field] = key.split("."); const rule = rules.find((r) => r.thing === thing && r.fields[0] === field); if (rule === undefined) throw new Error(`no rule on ${key}`); return `${rule.thing}.${rule.name}`; };
  const sorted = (names: Iterable<string>) => [...new Set(names)].sort();
  const order = (names: Iterable<string>) => [...names].sort(); // the wire's list sorted, not de-duplicated: the compiler names each rule once
  const truth: Record<string, ReadonlyArray<string>> = {};
  for (const [name, op] of Object.entries(unsigned.model.operations)) {
    truth[name] = sorted((BREAKS[name] ?? []).map(fullName));
    for (const owner of Object.values(op.invariants ?? {})) if (!truth[name]!.includes(owner)) throw new Error(`the fixture says ${name} does not break ${owner}, which it attaches a refusal for`);
    op.breaks = planted === undefined ? [...truth[name]!] : sorted((planted[name] ?? []).map(fullName));
  }
  const compiled = compiledKeys === null ? null : Object.fromEntries(Object.entries(compiledKeys).map(([name, keys]) => [name, order(keys.map(fullName))]));
  return { wire: { ...unsigned, digest: Wire.digestOf(unsigned) }, rules, truth, compiled };
};
