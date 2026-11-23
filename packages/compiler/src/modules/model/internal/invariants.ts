// A thing's rules (G5): what the model carries for each, what the compiler refuses before it does, and which operations can break one.
import type { AnyErrorClass, Field, Thing, Unique } from "orthograph";
import { Blanks, VERSION_RULE, versionRule } from "orthograph/server";
import type { InvariantModel, StepModel, ThingModel } from "../types.ts";
import { pascal, type ThingFiles } from "./layout.ts";
import { describeValue, sameValue, valueOfInput } from "./same-value.ts";

/** What `invariantsOf` needs to know about the rest of the blueprint. */
export interface RuleContext {
  readonly thingNames: ReadonlyMap<Thing, string>;
  readonly errorNames: ReadonlyMap<AnyErrorClass, string>;
  /** Every verb of every thing, with the errors it declares: a rule's refusal may not be among them. */
  readonly verbs: ReadonlyArray<{ readonly file: string; readonly errors: ReadonlyArray<AnyErrorClass> }>;
}

/** The key's field names, or undefined once a problem is found in the key (a missing field, another thing's, an empty tuple). */
const keyOf = (rule: Unique, t: ThingFiles, at: string, ctx: RuleContext, problems: Array<string>): ReadonlyArray<string> | undefined => {
  const fields = rule.fields as ReadonlyArray<Field | undefined>;
  if (fields.length === 0) return void problems.push(`${at} needs a key: at least one field of ${t.name}`);
  const names = fields.map((f) => {
    if (f === undefined || f.kind !== "field") return void problems.push(`${at}: its key is not a field of ${t.name}; write it as ${pascal(t.name)}.fields.<name>`);
    if (f.of !== t.thing) return void problems.push(`${at}: its key ${ctx.thingNames.get(f.of) ?? "?"}.${f.key} is a field of another thing, not of ${t.name}; a rule's key is a field of the thing whose invariants.ts it is in`);
    return f.key;
  });
  return names.every((n): n is string => n !== undefined) ? names : undefined;
};

/** The states a rule is `while`, by name, refused when one is not a state of this thing's own machine. */
const scopeOf = (rule: Unique, t: ThingFiles, at: string, problems: Array<string>): ReadonlyArray<string> | undefined => {
  if (rule.while === undefined) return undefined;
  if (t.machine === undefined) {
    problems.push(`${at}: is \`while\` states, and ${t.name} has no machine, so no states`);
    return [];
  }
  const known = Object.keys(t.machine.states);
  return (rule.while as ReadonlyArray<{ kind?: string; key?: string; machine?: unknown } | undefined>).flatMap((s) => {
    if (s === undefined || s.kind !== "state") problems.push(`${at}: its \`while\` names something that is not a state of ${t.name}'s machine (it has ${known.join(", ")}); write it as machine.states.<state>`);
    else if (s.machine !== t.machine) problems.push(`${at}: its \`while\` names the state ${s.key} of another thing's machine, not ${t.name}'s (${known.join(", ")})`);
    else return [s.key!];
    return [];
  });
};

/**
 * The model's `invariants` for one thing, or undefined when it has none. Refused, naming the file: a key that isn't the thing's own
 * field, a `while` that isn't one of its machine's states, a thing that lives as actors, a refusal that isn't the thing's own error,
 * is owned by another rule, is in a verb's `errors:`, or carries a field outside the key.
 */
export const invariantsOf = (t: ThingFiles, ctx: RuleContext, problems: Array<string>): ThingModel["invariants"] => {
  // A thing with versions holds one more rule that no file declares (see `versionRule`): the framework's, so two first saves cannot both be revision 1.
  const own = t.thing === undefined || t.invariants.has(VERSION_RULE) ? undefined : versionRule(t.thing);
  const rules = own === undefined ? t.invariants : new Map([...t.invariants, [VERSION_RULE, own]]);
  if (rules.size === 0) return undefined;
  const file = `${t.base}/invariants.ts`;
  const owners = new Map<AnyErrorClass, string>();
  const model: Record<string, InvariantModel> = {};
  const spelled = new Map<string, string>();
  for (const [name, rule] of [...rules].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))) {
    const at = `${file}: ${t.name}.${name}`;
    const clash = spelled.get(name.toLowerCase());
    if (clash !== undefined) problems.push(`${at}: ${t.name}.${clash} and ${t.name}.${name} differ only in case, and the database compares index names without regard to case (the second index would fail to be created); rename one`);
    else spelled.set(name.toLowerCase(), name);
    if (rule.form !== "unique") { problems.push(`${at}: is a "${rule.form}" rule, and only unique is known`); continue; }
    if (t.thing?.lives === "actor") problems.push(`${at}: a rule needs a thing that lives in the database, and ${t.name} lives as actors: each instance is its own Durable Object, a commit writes one instance, and there is no shared index or list to look in`);
    const fields = keyOf(rule, t, at, ctx, problems);
    const scope = scopeOf(rule, t, at, problems);
    const refuse = rule.refuse === undefined ? undefined : refusalOf(rule, t, name, fields ?? [], file, ctx, owners, problems);
    model[name] = {
      kind: "unique", fields: fields ?? [],
      ...(rule === own ? { framework: true as const } : {}),
      ...(scope === undefined ? {} : { while: scope }),
      ...(refuse === undefined ? {} : { refuse }),
      ...(rule.description === undefined ? {} : { description: rule.description }),
    };
  }
  return model;
};

const refusalOf = (rule: Unique, t: ThingFiles, name: string, key: ReadonlyArray<string>, file: string, ctx: RuleContext, owners: Map<AnyErrorClass, string>, problems: Array<string>): string | undefined => {
  const error = rule.refuse!;
  const tag = ctx.errorNames.get(error);
  const at = `${file}: ${t.name}.${name}`;
  if (tag === undefined || ![...t.errors.values()].includes(error)) {
    problems.push(`${at}: refuses ${tag ?? "an error that is not declared"}, which is not an error of ${t.name}; a rule refuses with an error from the same thing's errors.ts`);
    return undefined;
  }
  const first = owners.get(error);
  if (first !== undefined) problems.push(`${at}: ${tag} is already refused for ${t.name}.${first}; an error belongs to at most one rule`);
  else owners.set(error, name);
  for (const [field, input] of Object.entries(error.fields)) {
    if (!key.includes(field)) { problems.push(`${at}: ${tag} carries ${field}, which is not in the rule's key (${key.join(", ")}); the runtime fills the refusal from the caller's own row, so it may carry only key fields`); continue; }
    const keyField = t.thing?.fields[field];
    if (keyField === undefined) continue;
    const carried = valueOfInput(input);
    if (!sameValue(carried, keyField.value)) problems.push(`${at}: ${tag} carries ${field} as ${describeValue(carried)}, and the key field ${field} is ${describeValue(keyField.value)}; the runtime copies the caller's own value into the refusal, so declare the field with the key field's own value (share the constant), as ${pascal(t.name)}.fields.${field}`);
  }
  for (const verb of ctx.verbs) {
    if (verb.errors.includes(error)) problems.push(`${at}: ${tag} is refused by the runtime for ${t.name}.${name}; take it out of \`errors\` in ${verb.file}.`);
  }
  return tag;
};

/** What an operation is, as far as a rule can tell. */
export interface Acting {
  readonly thing: string;
  readonly move: { readonly to: ReadonlyArray<string> } | null;
  readonly steps: Readonly<Record<string, StepModel>>;
}

/**
 * The rules an operation can break (G5, section 3): its move on the rule's thing can end in a `while` state (any move, for a rule with
 * no `while`); one of its database steps names the thing in `writes`; or the thing has no machine, and the operation is on it and has a
 * database step that leaves `writes` unset (unknown; `writes: []` is reads only, S31). `refusals` maps each broken rule's refusal to the rule's full name; `breaks` is every rule broken, refusal or not.
 */
export const breakersOf = (op: Acting, things: Readonly<Record<string, ThingModel>>): { readonly refusals: Readonly<Record<string, string>>; readonly breaks: ReadonlyArray<string> } => {
  const database = Object.values(op.steps).filter((s) => s.type === "database");
  const refusals: Record<string, string> = {};
  const breaks: Array<string> = [];
  for (const [thing, t] of Object.entries(things)) {
    for (const [name, rule] of Object.entries(t.invariants ?? {})) {
      const own = op.thing === thing;
      const byMove = own && op.move !== null && (rule.while === undefined || op.move.to.some((s) => rule.while!.includes(s)));
      const byWrites = database.some((s) => s.writes?.includes(thing));
      const bare = own && t.machine === null && database.some((s) => s.writes === undefined);
      if (!byMove && !byWrites && !bare) continue;
      breaks.push(`${thing}.${name}`);
      if (rule.refuse !== undefined) refusals[rule.refuse] = `${thing}.${name}`;
    }
  }
  return { refusals, breaks };
};

/** A verb's declared errors, empty while they are a blank. */
export const declaredErrors = (errors: unknown): ReadonlyArray<AnyErrorClass> => (Blanks.isBlank(errors) ? [] : (errors as ReadonlyArray<AnyErrorClass>));
