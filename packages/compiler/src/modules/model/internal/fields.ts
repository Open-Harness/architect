// A field of the model: what it holds, the named value it uses, the thing field it was taken from, and on a chain store its Solidity type.
import type { Field, FieldsInput, Role, Thing, Value, Visibility } from "orthograph";
import type { FieldModel, FieldsModel, VisibilityModel } from "../types.ts";
import { chainField } from "./chain.ts";
import { isNullable } from "./nullable.ts";
import { metaOf, type Names, type Owner } from "./money.ts";

/** Where a field is declared: `Blueprint.issued` is allowed in one of these. */
export type Place = "answer" | "a payload" | "an error" | "an event" | "a thing's field" | "a read answer";

/** Which declaration a field belongs to: the thing it is of (undefined for a named value), and whether that thing lives on a chain. */
export interface FieldContext {
  readonly place: Place;
  readonly owner?: Owner;
  readonly chain?: boolean;
}

const problem = (problems: Array<string>, p: string): string => {
  problems.push(p);
  return "?";
};

export interface FieldsEnv {
  readonly valueNames: ReadonlyMap<Value, string>;
  readonly schemaNames: ReadonlyMap<unknown, string>;
  readonly thingNames: ReadonlyMap<Thing, string>;
  readonly roleNames: ReadonlyMap<Role, string>;
  readonly names: Names;
  readonly problems: Array<string>;
}

export const fieldsOf = ({ valueNames, schemaNames, thingNames, roleNames, names, problems }: FieldsEnv) => {
  const fieldRef = (f: Field): string | undefined => {
    const thing = thingNames.get(f.of);
    return thing ? `${thing}.${f.key}` : undefined;
  };
  /** Public is the default and is left out; a private role is named as `thing.role`. */
  const visibilityModel = (v: Visibility, where: string): VisibilityModel | undefined =>
    v === "public" ? undefined
    : v === "secret" ? "secret"
    : { private: v.to.map((r) => roleNames.get(r) ?? problem(problems, `${where}: is private to a role not exported from a roles.ts`)) };
  /** `Blueprint.issued` is allowed in one place: a secret value in an operation's answer. Anywhere else it is refused, naming the field. */
  const issuedIn = (input: Field | Value, where: string, place: Place): boolean => {
    if (input.issued !== true) return false;
    if (place !== "answer") problems.push(`${where}: is marked Blueprint.issued in ${place}: only a secret value in an operation's answer is issued`);
    else if (input.visibility !== "secret") problems.push(`${where}: is marked Blueprint.issued but is ${input.visibility === "public" ? "public" : "private"}: only a secret value is issued`);
    return place === "answer" && input.visibility === "secret";
  };
  const fieldModel = (input: Field | Value, where: string, ctx: FieldContext): FieldModel => {
    const value = input.kind === "field" ? input.value : input;
    // `Blueprint.issued(Secret)` is a copy of the named value, so it is found by the schema it shares with it.
    const named = valueNames.get(value) ?? (input.issued === true || input.description !== undefined ? schemaNames.get(value.schema) : undefined);
    const ref = input.kind === "field" ? fieldRef(input) : undefined;
    if (input.kind === "field" && !ref) problems.push(`${where}: uses a field of a thing that isn't in the blueprint`);
    const visibility = visibilityModel(input.visibility, where);
    const issued = issuedIn(input, where, ctx.place);
    const meta = metaOf(value.meta, where, ctx.owner, names, problems);
    // A width that is no whole number from 1 to 256 is refused for every store; on a chain it must also be a multiple of 8 (chain.ts).
    if ((meta.type === "uint" || meta.type === "money") && !(Number.isInteger(meta.bits) && meta.bits >= 1 && meta.bits <= 256)) {
      problems.push(`${where}: a ${meta.type} of ${String(meta.bits)} bits is no width: bits is a whole number from 1 to 256 (a chain store needs 8 to 256, in steps of 8)`);
    }
    const solidity = ctx.chain ? chainField(value, meta, input.visibility, where, problems) : undefined;
    return { value: meta, ...(value.optional === true ? { optional: true as const } : {}), ...(ctx.place === "a thing's field" && isNullable(value) ? { nullable: true as const } : {}), ...(solidity === undefined ? {} : { solidity }), ...(named ? { named } : {}), ...(ref ? { ref } : {}), ...(input.description === undefined ? {} : { description: input.description }), ...(visibility ? { visibility } : {}), ...(issued ? { issued: true as const } : {}) };
  };
  const fieldsModel = (fields: FieldsInput, where: string, ctx: FieldContext): FieldsModel =>
    Object.fromEntries(Object.entries(fields).map(([k, f]) => [k, fieldModel(f, `${where} field ${k}`, ctx)]));
  return { fieldModel, fieldsModel };
};
