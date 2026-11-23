import { Audience, Visibility } from "@orthograph/language-effect/visibility";
import type { ModelView } from "../types.ts";

export interface Facts {
  readonly name: string;
  readonly code: string | undefined;
  /** Unknown for a built-in refusal the model does not give an exit (`NotAllowed`). */
  readonly exit: number | undefined;
  /** Declared fields the caller may see (public: no visibility), and those it may not. Absent when the model declares none to judge. */
  readonly shown: ReadonlyArray<string>;
  readonly hidden: ReadonlyArray<string>;
  /** True when the model declares this refusal's fields, so the set shown is exact; a built-in's are not judged for extras. */
  readonly declared: boolean;
}

type Field = Parameters<typeof Visibility.sees>[1];
type Role = NonNullable<Parameters<typeof Audience.agent>[0]>[number];

/**
 * Whether a caller holding `held` (role names) is shown a field the model declares with `visibility`, by the runtime's own rule
 * (`Visibility.sees`, an agent audience: what MCP and the CLI's caller are shown of a refusal). The model's JSON is turned into what
 * the rule reads the way the runtime does: `{ private: [role names] }` becomes `{ to: [roles] }`, and a role is one object per name,
 * so a held role is the same role the field names.
 */
export const shownTo = (visibility: unknown, held: ReadonlyArray<string>): boolean => {
  const roles = new Map<string, Role>();
  const role = (name: string) => roles.get(name) ?? (roles.set(name, { name } as unknown as Role), roles.get(name)!);
  const declared = visibility === undefined ? "public"
    : typeof visibility === "object" && visibility !== null && "private" in visibility ? { to: (visibility as { readonly private: ReadonlyArray<string> }).private.map(role) }
    : visibility;
  return Visibility.sees(Audience.agent(held.map(role)), { kind: "field", visibility: declared } as unknown as Field);
};

/** What the model says about one refusal: its code, its exit, and which of its fields the caller, holding `held`, may see. */
export const factsOf = (model: ModelView, name: string, held: ReadonlyArray<string> = []): Facts => {
  const things = Object.values(model.things);
  const own = things.map((t) => t.errors?.[name]).find((e) => e !== undefined);
  const machine = things.map((t) => t.machine?.notFrom).find((n) => n?.error === name);
  const missed = things.map((t) => t.notFound).find((n) => n?.error === name);
  const code = model.refusals[name] ?? own?.code ?? machine?.code ?? missed?.code;
  if (own !== undefined) {
    const fields = Object.entries(own.fields);
    return { name, code, exit: own.exit, shown: fields.filter(([, f]) => shownTo(f.visibility, held)).map(([k]) => k), hidden: fields.filter(([, f]) => !shownTo(f.visibility, held)).map(([k]) => k), declared: true };
  }
  // The machine's own refusal carries the state the thing was in, which is public.
  if (machine !== undefined) return { name, code, exit: machine.exit, shown: ["state"], hidden: [], declared: true };
  // A thing's not-found refusal carries no fields.
  if (missed !== undefined) return { name, code, exit: missed.exit, shown: [], hidden: [], declared: true };
  return { name, code, exit: undefined, shown: [], hidden: [], declared: false };
};

/** The operations whose declared refusals include `refusal`: where its docs row and its portal arrow must be. */
export const declaredBy = (model: ModelView, refusal: string): ReadonlyArray<string> =>
  Object.values(model.operations).filter((op) => (op.refusals ?? op.errors ?? []).includes(refusal)).map((op) => op.name).sort();

/** The text of a refusal line the CLI or MCP printed: `[CODE] Name { a: 1, b: x }`, parsed into its three parts. */
export const parseLine = (line: string): { readonly code: string; readonly name: string; readonly keys: ReadonlyArray<string> } | undefined => {
  const found = /^\[([A-Za-z0-9-]+)\] ([A-Za-z0-9_]+)(?: \{ (.*) \})?$/.exec(line.trim());
  if (found === null) return undefined;
  const body = found[3] ?? "";
  return { code: found[1]!, name: found[2]!, keys: body === "" ? [] : [...body.matchAll(/(?:^|, )([A-Za-z0-9_]+): /g)].map((m) => m[1]!) };
};

/** What a refusal line must show and must not, judged against the facts: the problems, empty when it is right. */
export const lineProblems = (facts: Facts, line: string): ReadonlyArray<string> => {
  const parsed = parseLine(line);
  if (parsed === undefined) return [`"${line}" is not "[${facts.code ?? "code"}] ${facts.name} { … }"`];
  const keys = new Set(parsed.keys);
  return [
    ...(parsed.name === facts.name ? [] : [`names ${parsed.name}, expected ${facts.name}`]),
    ...(facts.code === undefined ? [`the model has no code for ${facts.name}`] : parsed.code === facts.code ? [] : [`carries code ${parsed.code}, expected ${facts.code}`]),
    ...facts.shown.filter((k) => !keys.has(k)).map((k) => `leaves out the public field ${k}`),
    ...facts.hidden.filter((k) => keys.has(k)).map((k) => `shows ${k}, which the caller may not see`),
    ...(facts.declared ? parsed.keys.filter((k) => !facts.shown.includes(k) && !facts.hidden.includes(k)).map((k) => `shows ${k}, which ${facts.name} does not declare`) : []),
  ];
};
