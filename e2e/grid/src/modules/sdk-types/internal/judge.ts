// What a resolved type is, judged against the model's kind. Every rule is on the checker's type, never on the text that wrote it.
import ts from "typescript";
import type { Built } from "./program.ts";
import { virtualPath } from "./program.ts";

const F = ts.TypeFlags;

/** Types a value can never usefully be: they hold anything, or nothing. (`null` is judged on its own.) */
const HOLLOW = F.Any | F.Unknown | F.Never | F.Void | F.NonPrimitive | F.ESSymbolLike;

export type Kind = "string" | "number" | "boolean" | "opaque";

const KIND_OF: Readonly<Record<string, Kind>> = { id: "string", text: "string", uint: "number", int: "number", boolean: "boolean", bool: "boolean" };
export const kindOf = (modelType: string): Kind => KIND_OF[modelType] ?? "opaque";

const WANT: Readonly<Record<Kind, string>> = { string: "exactly string", number: "exactly bigint or number", boolean: "exactly boolean", opaque: "a type derived from its own declaration" };

export const membersOf = (type: ts.Type): ReadonlyArray<ts.Type> => (type.isUnion() ? type.types : [type]);

/** Does the checker's type allow `undefined`? */
export const allowsUndefined = (type: ts.Type): boolean => membersOf(type).some((m) => (m.flags & F.Undefined) !== 0);

/** The `__field` tag a type carries, as the program's stand-in for a declaration wrote it. */
const tagOf = (b: Built, type: ts.Type): string | undefined => {
  const property = type.getProperty("__field");
  const tag = property === undefined ? undefined : b.checker.getTypeOfSymbol(property);
  return tag !== undefined && (tag.flags & F.StringLiteral) !== 0 ? (tag as ts.StringLiteralType).value : undefined;
};

/** The same type: each assignable to the other. (`any` is, to everything, so it is refused before this.) */
const same = (b: Built, x: ts.Type, y: ts.Type): boolean => b.checker.isTypeAssignableTo(x, y) && b.checker.isTypeAssignableTo(y, x);

/** What the model's kind is as a TypeScript primitive, as the generator emits it: a uint is a bigint (a number is accepted too). */
const primitives = (b: Built, kind: Kind): ReadonlyArray<ts.Type> =>
  kind === "string" ? [b.checker.getStringType()] : kind === "number" ? [b.checker.getBigIntType(), b.checker.getNumberType()] : kind === "boolean" ? [b.checker.getBooleanType()] : [];

/**
 * Why a member's type is not the field's (`undefined` when it is). A type derived from the declaration must be IDENTICAL to this field's own stand-in (`expected`, mutually
 * assignable), so another field's, a narrowed one, or one with anything intersected or unioned in is red. A type the SDK spells out must be identical to the primitive the model's
 * kind is (`string`, `bigint`), so a literal or a union is red. `undefined` is the field's optionality, judged by the caller; `null` and anything hollow are red.
 */
export const kindProblem = (b: Built, kind: Kind, type: ts.Type, tag: string, expected: ts.Type | undefined): string | undefined => {
  const parts = membersOf(type);
  if (parts.every((p) => (p.flags & F.Undefined) !== 0)) return "holds no value";
  const shown = b.checker.typeToString(type);
  if (parts.some((p) => (p.flags & F.Null) !== 0)) return `resolves to ${shown}, which may be null`;
  if (parts.some((p) => (p.flags & HOLLOW) !== 0)) return `resolves to ${shown}, which holds no usable value`;
  const value = b.checker.getNonNullableType(type);
  const found = parts.map((p) => tagOf(b, p)).find((t) => t !== undefined);
  if (found !== undefined) {
    if (found !== tag) return `resolves to ${shown}, which is derived from ${found}, not from ${tag}`;
    // `{ [k: string]: any }` is assignable both ways to a branded value, so identity cannot see an index signature intersected in: every part is looked at.
    const withIndex = (value.isIntersection() ? value.types : [value]).some((c) => (c.flags & F.Object) !== 0 && b.checker.getIndexInfosOfType(c).length > 0);
    if (withIndex) return `resolves to ${shown}, which includes a type with an index signature and so takes any key`;
    return expected !== undefined && same(b, value, expected) ? undefined : `resolves to ${shown}, which is not the type the declaration gives ${tag}`;
  }
  return primitives(b, kind).some((p) => same(b, value, p)) ? undefined : `resolves to ${shown}, which is not ${WANT[kind]}`;
};

/** The type a name is exported as from an SDK file (an alias or an interface), `undefined` when it is not. */
export const exportedType = (b: Built, path: string, name: string): ts.Type | undefined => {
  const file = b.program.getSourceFile(virtualPath(path));
  const module = file === undefined ? undefined : b.checker.getSymbolAtLocation(file);
  const symbol = module === undefined ? undefined : b.checker.getExportsOfModule(module).find((s) => s.getName() === name);
  const target = symbol === undefined ? undefined : (symbol.flags & ts.SymbolFlags.Alias) !== 0 ? b.checker.getAliasedSymbol(symbol) : symbol;
  return target === undefined ? undefined : b.checker.getDeclaredTypeOfSymbol(target);
};

/** Every SDK file's exported type names that are the thing's state type. */
export const stateTypeNames = (b: Built, identifier: string): ReadonlyArray<{ readonly path: string; readonly name: string }> => {
  const pattern = new RegExp(`^${identifier}(State|States|Status)$`);
  return b.program.getSourceFiles().filter((f) => f.fileName.startsWith(virtualPath("generated/sdk/"))).flatMap((file) => {
    const module = b.checker.getSymbolAtLocation(file);
    return module === undefined ? [] : b.checker.getExportsOfModule(module).filter((s) => pattern.test(s.getName())).map((s) => ({ path: file.fileName.slice(virtualPath("").length), name: s.getName() }));
  });
};

/** Is the type exactly the union of these string literals: every state, and nothing else (no `string`, no other literal, no `undefined`)? */
export const exactStates = (b: Built, type: ts.Type, states: ReadonlyArray<string>): string | undefined => {
  const parts = membersOf(type);
  const literals = parts.flatMap((p) => ((p.flags & F.StringLiteral) !== 0 ? [(p as ts.StringLiteralType).value] : []));
  const shape = parts.map((p) => shapeProblem(b, p)).find((w) => w !== undefined);
  if (shape !== undefined) return `resolves to ${b.checker.typeToString(type)}, which ${shape}`;
  const exact = literals.length === parts.length && states.every((s) => literals.includes(s)) && literals.every((l) => states.includes(l));
  return exact ? undefined : `resolves to ${b.checker.typeToString(type)}, not exactly the machine's states (${states.join(" | ")})`;
};

/** Why a type is not the plain shape a value has: a call or construct signature makes it callable or constructible, an index signature makes it take any key. */
export const shapeProblem = (b: Built, type: ts.Type): string | undefined =>
  // A primitive has the signatures of its wrapper (`string` has a numeric index), which are no part of the type: only an object part, or an object in an intersection, is looked at.
  (type.isIntersection() ? type.types : [type]).filter((part) => (part.flags & F.Object) !== 0).flatMap((part) =>
    b.checker.getSignaturesOfType(part, ts.SignatureKind.Call).length > 0 ? ["has a call signature, so it is callable"]
    : b.checker.getSignaturesOfType(part, ts.SignatureKind.Construct).length > 0 ? ["has a construct signature, so it can be constructed"]
    : b.checker.getIndexInfosOfType(part).length > 0 ? ["has an index signature, so it takes any key"]
    : [])[0];

/** Why an exported thing type is not one object type: a union (`Link | string`) is not, nor is an intersection with anything that is not an object shape. */
export const objectProblem = (type: ts.Type): string | undefined =>
  type.isUnion() ? "is a union, not one object type"
  : (type.isIntersection() ? type.types : [type]).some((part) => (part.flags & F.Object) === 0) ? "is not an object type"
  : undefined;
