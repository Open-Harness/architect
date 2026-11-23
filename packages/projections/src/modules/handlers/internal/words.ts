// The sentences a handler's scaffold, its journey stubs and the docs page share (K16 a): who may call, what a field is,
// where a declaration's file is, and every refusal with who gives it. Every word is a name from the model or a fixed
// phrase about Orthograph itself; nothing names the domain unless the blueprint does.
import type { AllowedModel, FieldModel, FieldsModel, Model, OperationModel, ThingModel } from "@orthograph/compiler";
import { IDEMPOTENCY_CONFLICT, IDEMPOTENCY_CONFLICT_EXIT, NOT_ALLOWED_EXIT, ruleBehind } from "#modules/names/service.js";

/** The exit of a generated `<Thing>NotFound` (K16 g, M1.46); a thing that declares one keeps its own. */
export const NOT_FOUND_EXIT = 4;

/** A thing's own file, as the header cites it: the project's `blueprint/things/<thing>/<file>.ts`, or the plugin's. */
export const thingFile = (model: Model, thing: string, file: "thing" | "machine" | "errors" | "events" | "roles" | "invariants") => {
  const t = model.things[thing];
  return t && t.from.kind !== "app" ? `${t.from.package}/blueprint/things/${t.from.thing}/${file}.js` : `blueprint/things/${thing}/${file}.ts`;
};

export const roleName = (role: string) => role.split(".").pop() ?? role;
const roleThing = (role: string) => role.split(".")[0] ?? role;

/** One `allowed` entry in words: the docs page's own phrase. */
export const callerOf = (a: AllowedModel) => {
  if (a.kind === "anyone") return "anyone";
  if (a.kind === "system") return "the system";
  // A narrowed entry says which ways in it keeps (M2-auth, fork 2): `.via(Via.session)` is "by session".
  const by = "via" in a && a.via !== undefined ? ` by ${a.via.join(" or ")}` : "";
  if (a.kind === "signed-in") return `anyone signed in${by}`;
  if (a.service !== undefined) return `the ${a.service} service`;
  return `${a.kind === "role" ? `the ${roleName(a.role)} of the ${roleThing(a.role)}` : `the ${roleName(a.role)} of its ${a.path}`}${by}`;
};

/** Who may call an operation: "the grantee of the allowance", "the owner of its organization", "anyone signed in". */
export const who = (op: OperationModel) => op.allowed.map(callerOf).join(", or ");

/** The file an `allowed` entry is declared in: its role's thing's roles file, or the verb's own for anyone and signed-in. */
export const allowedFile = (model: Model, op: OperationModel, a: AllowedModel) =>
  a.kind === "role" || a.kind === "role-of" ? thingFile(model, roleThing(a.role), "roles") : op.file;

/** The rule a role holds, as the model keeps it, when it has one. */
export const ruleOf = (model: Model, a: AllowedModel) =>
  (a.kind === "role" || a.kind === "role-of") && a.service === undefined ? model.things[roleThing(a.role)]?.roleRules[roleName(a.role)] ?? null : null;

/** What a field is: what it references, else the value it is named for, else its type. */
export const label = (f: FieldModel) =>
  f.ref ?? f.named ?? (f.value.type === "schema" && f.value.format === "ref-any" ? "any thing (declaration and id)" : f.value.type);

/** Who sees a field that isn't public (M1.35's rule), in the words of `who`. */
export const seenBy = (f: FieldModel) =>
  !f.visibility ? ""
    : f.visibility === "secret" ? " (secret: no caller sees it)"
      : ` (private: only ${f.visibility.private.map((r) => `the ${roleName(r)} of the ${roleThing(r)}`).join(" or ")} sees it)`;

/** "an Amount", "a Memo". */
export const an = (word: string) => (/^[aeiou]/i.test(word) ? `an ${word}` : `a ${word}`);

/** "a", "a and b", "a, b and c". */
export const listed = (xs: ReadonlyArray<string>) => (xs.length <= 1 ? (xs[0] ?? "") : `${xs.slice(0, -1).join(", ")} and ${xs.at(-1)}`);

/** Rows as columns, each padded to its longest entry plus two spaces; the last column is never padded. */
export const columns = (rows: ReadonlyArray<ReadonlyArray<string>>): ReadonlyArray<string> => {
  const widths = (rows[0] ?? []).map((_, i) => Math.max(...rows.map((r) => (r[i] ?? "").length)) + 2);
  return rows.map((r) => r.map((cell, i) => (i === r.length - 1 ? cell : cell.padEnd(widths[i]!))).join(""));
};

/** The thing whose generated (or adopted) `<Thing>NotFound` this refusal is, if it is one. */
export const notFoundOf = (model: Model, refusal: string): ThingModel | undefined =>
  Object.values(model.things).find((t) => `${t.identifier}NotFound` === refusal);

/** A refusal of an operation: its exit, its code, and in words who gives it and when, citing the file it came from. */
export interface Refusal {
  readonly name: string;
  readonly exit: number | "?";
  readonly code: string;
  /** `yours` when the handler refuses it, `runtime` when the runtime does before the handler runs. */
  readonly giver: "yours" | "runtime";
  readonly said: string;
  readonly file: string;
  readonly fields: ReadonlyArray<string>;
  /** The fields as the model holds them, for a declared error's blanks. */
  readonly fieldModels: FieldsModel;
}

/** The thing that declares an error: the operation's own first, else the one it borrows it from. */
const ownerOf = (model: Model, op: OperationModel, error: string) =>
  model.things[op.thing]?.errors[error] ? op.thing : Object.values(model.things).find((t) => t.errors[error])?.name;

export const refusalsOf = (model: Model, op: OperationModel): ReadonlyArray<Refusal> => {
  const thing = model.things[op.thing];
  const code = (r: string) => model.refusals[r] ?? "?";
  return op.refusals.map((r): Refusal => {
    const owner = op.errors.includes(r) ? ownerOf(model, op, r) : undefined;
    const declared = owner ? model.things[owner]?.errors[r] : thing?.errors[r];
    if (owner && declared) {
      const fields = Object.keys(declared.fields);
      return { name: r, exit: declared.exit, code: code(r), giver: "yours", fields, fieldModels: declared.fields, file: thingFile(model, owner, "errors"), said: `yours to refuse below${fields.length ? `, carrying ${fields.join(", ")}` : ""}` };
    }
    // A rule's refusal (G5): the runtime's, never the handler's, so the scaffold has no blank for it; the header says which rule and where it is written.
    const rule = ruleBehind(model, op, r);
    const refused = rule ? model.things[rule.thing]?.errors[r] : undefined;
    if (rule && refused) {
      return { name: r, exit: refused.exit, code: code(r), giver: "runtime", fields: Object.keys(refused.fields), fieldModels: refused.fields, file: thingFile(model, rule.thing, "invariants"), said: `the runtime's: ${rule.sentence} (${rule.full})` };
    }
    if (thing?.machine && r === thing.machine.notFrom.error) {
      const from = op.move?.from.length ? op.move.from : thing.machine.states;
      return { name: r, exit: thing.machine.notFrom.exit, code: code(r), giver: "runtime", fields: ["state"], fieldModels: {}, file: thingFile(model, op.thing, "machine"), said: `the runtime's, when the ${op.thing} isn't in ${from.join(" or ")}, carrying state` };
    }
    if (r === IDEMPOTENCY_CONFLICT) {
      // The runtime's, before the handler runs (G3): a handler can neither make nor avoid it, as NotAllowed; the header still says it, from where the operation says `idempotent`.
      return { name: r, exit: IDEMPOTENCY_CONFLICT_EXIT, code: code(r), giver: "runtime", fields: [], fieldModels: {}, file: op.file, said: "the runtime's, when the same request key comes with another payload" };
    }
    if (r === "NotAllowed") {
      const first = op.allowed[0];
      return { name: r, exit: NOT_ALLOWED_EXIT, code: code(r), giver: "runtime", fields: [], fieldModels: {}, file: first ? allowedFile(model, op, first) : op.file, said: `the runtime's, when the caller isn't ${who(op)}` };
    }
    const missing = notFoundOf(model, r);
    if (missing) {
      const own = missing.errors[r];
      return { name: r, exit: own?.exit ?? NOT_FOUND_EXIT, code: code(r), giver: "runtime", fields: ["id"], fieldModels: {}, file: thingFile(model, missing.name, own ? "errors" : "thing"), said: `the runtime's, when no ${missing.name} has that id, carrying id` };
    }
    return { name: r, exit: declared?.exit ?? "?", code: code(r), giver: "runtime", fields: Object.keys(declared?.fields ?? {}), fieldModels: declared?.fields ?? {}, file: thingFile(model, op.thing, "errors"), said: "the runtime's" };
  });
};
