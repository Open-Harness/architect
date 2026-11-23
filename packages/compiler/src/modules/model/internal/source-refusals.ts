// What the compiler refuses of a source's mapping that TypeScript cannot, each on one problem line of the file the fault is in
// (GOAL17-source-from, "The model"; built in slice 11): a `gone` error the reply call does not declare, a config with no `me`
// of the `{ id, login }` shape, an `environment.of` whose keys are not the names `variables` declares, and a connection
// naming an event no kind the source makes produces.
import type { SourceKind } from "orthograph";
import type { Layout } from "./layout.ts";

type Node = { readonly ast?: { readonly _tag?: string; readonly context?: { readonly isOptional?: boolean } } };
type Spec = NonNullable<SourceKind<any>["spec"]>;

/** A required string field: a `Schema.String`, which the schema does not mark optional. */
const requiredString = (field: unknown): boolean => {
  const ast = (field as Node | undefined)?.ast;
  return ast?._tag === "String" && ast.context?.isOptional !== true;
};

/** `me` is a struct of exactly `id` and `login`, each a required string: the shape is judged, not the identity of the schema. */
const meShape = (config: unknown): boolean => {
  const me = (config as { readonly fields?: Readonly<Record<string, unknown>> }).fields?.["me"] as { readonly fields?: Readonly<Record<string, unknown>> } | undefined;
  const fields = me?.fields;
  return fields !== undefined && Object.keys(fields).sort().join() === "id,login" && requiredString(fields["id"]) && requiredString(fields["login"]);
};

/** The names `environment.of` answers for a trigger whose address answers any property with text; `undefined` where it cannot be read that way. */
const keysOf = (spec: Spec): ReadonlyArray<string> | undefined => {
  const anything: object = new Proxy({}, { get: (_t, key) => (key === Symbol.toPrimitive ? () => "x" : "x") });
  try {
    return Object.keys(spec.environment.of({ kind: "x", thread: "x", text: "x", channel: anything })).sort();
  } catch {
    return undefined;
  }
};

export const refuseSpec = (problems: Array<string>, file: string, exportName: string, spec: Spec, callName: (call: unknown) => string | undefined): void => {
  if (!meShape(spec.config)) problems.push(`${file}: ${exportName}'s config has no \`me\` of the shape { id: string, login: string }: the gate and the mapping need the agent's own account`);
  const declared = spec.reply?.call.errors ?? [];
  for (const gone of spec.reply?.gone ?? []) {
    if (!declared.includes(gone)) {
      problems.push(`${file}: ${exportName}'s reply.gone lists ${(gone as { readonly name?: string }).name ?? "an error"}, which ${callName(spec.reply!.call) ?? "the reply call"} does not declare (its errors: ${declared.map((e) => e.name).join(", ") || "none"}): a gone error is one of the reply call's own`);
    }
  }
  const named = Object.keys(spec.environment.variables).sort();
  const made = keysOf(spec);
  if (made !== undefined) {
    for (const key of made.filter((k) => !named.includes(k))) problems.push(`${file}: ${exportName}'s environment.of returns ${key}, which environment.variables does not declare`);
    for (const key of named.filter((k) => !made.includes(k))) problems.push(`${file}: ${exportName}'s environment.of does not return ${key}, which environment.variables declares`);
  }
};

/** What kinds a source makes: the string literals of each `kind:` in its `on` mappings (see `kindsOf`). */
export const refuseConnection = (problems: Array<string>, file: string, layout: Layout, kind: SourceKind<any>, config: unknown, kindsOf: (on: Readonly<Record<string, unknown>>) => ReadonlyArray<string>): void => {
  const entry = [...layout.sources].find(([, s]) => s.declaration === kind);
  const events = (config as { readonly events?: unknown } | null)?.events;
  if (entry === undefined || kind.spec === undefined || !Array.isArray(events)) return;
  // A connection lists a kind (`comment`) or the group of them (`comments`).
  const made = kindsOf(kind.spec.on ?? {});
  for (const event of events.filter((e): e is string => typeof e === "string")) {
    if (!made.some((k) => event === k || event === `${k}s`)) problems.push(`${file}: a connection of ${entry[1].exportName} names the event "${event}", which no kind ${entry[1].exportName} makes produces (its kinds: ${made.join(", ")})`);
  }
};
