import type { FromModel } from "../types.ts";
// Refusal codes, stable across targets: `[AL-002] AllowanceExceeded { limit: 500 }`. A code is its thing's prefix and a
// number. Declared errors are numbered 1, 2, 3 in the order they are declared in the thing's `errors.ts`; the machine's own
// refusal is always 900, and its generated `<Thing>NotFound` 901; the runtime's refusals belong to no thing and take the prefix `AR`. The model records every code,
// so a generator reads it and never works one out, and a number that has shipped does not move when an error is added.
import type { AnyErrorClass, Thing } from "orthograph";

/** The refusal of a machine's move that starts from the wrong state. */
export const MACHINE_NUMBER = 900;

/** The runtime's refusal for a request key reused with another payload: its name, written once. */
export const IDEMPOTENCY_CONFLICT = "IdempotencyConflict";

/** Refusals the runtime makes for every thing, numbered in the order it gained them: who may call (before any handler runs), then a request key reused with another payload. */
export const RUNTIME_CODES = { NotAllowed: "AR-001", [IDEMPOTENCY_CONFLICT]: "AR-002" } as const;

/** Codes held for refusals the Worker never returns, so no model lists them: the caller's door makes this one when a person says no (#466). Kept apart from RUNTIME_CODES, which feeds every model's `refusals`. */
export const RESERVED_CODES = { ApprovalDeclined: "AR-007" } as const;

const PREFIX = /^[A-Z]{2,4}$/;

/** The thing's own prefix, or the first two letters of its name. */
export const prefixOf = (name: string, thing: Thing): string => thing.code ?? name.replace(/[^a-z]/g, "").slice(0, 2).toUpperCase();

export const codeOf = (prefix: string, n: number): string => `${prefix}-${String(n).padStart(3, "0")}`;

/** Each thing's prefix: valid, distinct from other things, and outside every runtime refusal's namespace. */
export const prefixes = (things: ReadonlyMap<string, { readonly thing?: Thing | undefined; readonly base?: string }>, problems: Array<string>): ReadonlyMap<string, string> => {
  const out = new Map<string, string>();
  const owner = new Map<string, { readonly thing: string; readonly file: string } | { readonly runtime: string }>(
    Object.entries(RUNTIME_CODES).map(([name, code]) => [code.slice(0, code.indexOf("-")), { runtime: name }]),
  );
  for (const [name, t] of [...things].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))) {
    if (!t.thing) continue;
    const prefix = prefixOf(name, t.thing);
    const file = t.base?.startsWith("blueprint/") === false ? `${t.base}/thing.js` : `blueprint/things/${name}/thing.ts`;
    if (!PREFIX.test(prefix)) problems.push(`${file}: the refusal code prefix "${prefix}" must be 2 to 4 capital letters; set \`code\` on the thing`);
    const other = owner.get(prefix);
    if (other && "runtime" in other) problems.push(`${file}: ${prefix}- is reserved for runtime refusals (${other.runtime}); set \`code\` on the thing to a distinct prefix`);
    else if (other) problems.push(`${file}: ${name} and ${other.thing} (${other.file}) would both have refusal codes starting ${prefix}-; give one of them a \`code\` of its own`);
    else owner.set(prefix, { thing: name, file });
    out.set(name, prefix);
  }
  return out;
};

/** A thing's declared errors in declaration order. A class made before errors were numbered falls back to its name. */
export const inDeclarationOrder = (errors: ReadonlyMap<string, AnyErrorClass>): ReadonlyArray<readonly [string, AnyErrorClass]> =>
  [...errors].sort(([an, a], [bn, b]) => (typeof a.sequence === "number" && typeof b.sequence === "number" ? a.sequence - b.sequence : an < bn ? -1 : an > bn ? 1 : 0));

/** Every refusal's name and code in the project: the declared ones, each machine's, and the runtime's. */
export const refusalsOf = (
  things: Readonly<Record<string, { readonly errors: Readonly<Record<string, { readonly code: string }>>; readonly machine: { readonly notFrom: { readonly error: string; readonly code: string } } | null; readonly notFound?: { readonly error: string; readonly code: string }; readonly from: FromModel }>>,
  problems: Array<string>,
): Readonly<Record<string, string>> => {
  const out: Record<string, string> = { ...RUNTIME_CODES };
  const owner = new Map<string, string>(Object.entries(RUNTIME_CODES).map(([name, code]) => [code, name]));
  const declaredIn = new Map<string, string>();
  const add = (name: string, code: string, where: string) => {
    if (name in RESERVED_CODES) problems.push(`${where}: ${name} is reserved (${RESERVED_CODES[name as keyof typeof RESERVED_CODES]}): the caller makes it when a person declines, so a thing cannot declare it`);
    else if (name in out) problems.push(`${where}: the refusal ${name} is declared twice${declaredIn.has(name) ? `, also in ${declaredIn.get(name)}` : " (the runtime has it)"}, and refusals are named for the whole project`);
    else declaredIn.set(name, where);
    const other = owner.get(code);
    if (other !== undefined) problems.push(`${where}: ${other} and ${name} share ${code}; refusal codes must be unique (a machine reserves number ${MACHINE_NUMBER}); codes are never silently renumbered`);
    else owner.set(code, name);
    out[name] = code;
  };
  for (const [thing, t] of Object.entries(things)) {
    const at = (file: string) => (t.from.kind !== "app" ? `${t.from.package}/blueprint/things/${t.from.thing}/${file}.js` : `blueprint/things/${thing}/${file}.ts`);
    for (const [name, e] of Object.entries(t.errors)) add(name, e.code, at("errors"));
    if (t.machine) add(t.machine.notFrom.error, t.machine.notFrom.code, at("machine"));
    // A generated not-found refusal; one the thing declares under that name is already added, with its own code.
    if (t.notFound && !(t.notFound.error in t.errors)) add(t.notFound.error, t.notFound.code, at("thing"));
  }
  return Object.fromEntries(Object.entries(out).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
};
