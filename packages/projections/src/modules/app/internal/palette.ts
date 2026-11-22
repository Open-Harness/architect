// The palette's index (`palette.json`) and what filters it (`palette.ts`): every page, then every operation a page offers, each
// with who may use it. The filter runs in the caller's own process, over data, so an agent and the shell read the same list.
import type { Model } from "@orthograph/compiler";
import type { MapView, PaletteEntry } from "../types.ts";

const byName = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

/** The pages by name, then each page's offered operations (its effective offers), by page and then operation. */
export const paletteOf = (view: MapView, model: Model): ReadonlyArray<PaletteEntry> => [
  ...view.pages.map((p): PaletteEntry => ({ kind: "page", name: p.name, path: p.path, description: p.description, allowed: p.allowed })),
  ...view.pages.flatMap((p) => [...p.offers].sort(byName).map((op): PaletteEntry => ({
    kind: "operation",
    name: op,
    page: p.name,
    component: p.components.find((c) => c.offers.includes(op))?.name ?? null,
    description: model.operations[op]?.description ?? "",
    allowed: model.operations[op]?.allowed ?? [],
  }))),
];

const GENERATED = "// Generated from the blueprint. Do not edit.";

/** `palette.ts`: the entries as data, and `visibleTo`: what an anonymous caller or a signed-in person may open and call. */
export const paletteModule = (entries: ReadonlyArray<PaletteEntry>): string => [
  GENERATED,
  "",
  "export type Allowed =",
  '  | { readonly kind: "anyone" }',
  '  | { readonly kind: "signed-in" }',
  '  | { readonly kind: "role"; readonly role: string }',
  '  | { readonly kind: "role-of"; readonly role: string; readonly path: string };',
  "",
  "export type PaletteEntry =",
  '  | { readonly kind: "page"; readonly name: string; readonly path: string; readonly description: string; readonly allowed: ReadonlyArray<Allowed> }',
  '  | { readonly kind: "operation"; readonly name: string; readonly page: string; readonly component: string | null; readonly description: string; readonly allowed: ReadonlyArray<Allowed> };',
  "",
  "export type Caller = \"anonymous\" | \"person\";",
  "",
  `export const entries: ReadonlyArray<PaletteEntry> = ${JSON.stringify(entries, null, 2)};`,
  "",
  "/** An anonymous caller passes only `anyone`. A person passes `anyone`, `signed-in` or a role: a role is decided on an instance, so it is not ruled out here. */",
  "const passes = (allowed: ReadonlyArray<Allowed>, caller: Caller): boolean =>",
  '  caller === "person" ? allowed.length > 0 : allowed.some((a) => a.kind === "anyone");',
  "",
  "/** What the caller may open and call: a page whose `allowed` they pass, and an operation of such a page whose own `allowed` they pass. */",
  "export const visibleTo = (caller: Caller): ReadonlyArray<PaletteEntry> => {",
  '  const pages = new Set(entries.flatMap((e) => (e.kind === "page" && passes(e.allowed, caller) ? [e.name] : [])));',
  '  return entries.filter((e) => (e.kind === "page" ? pages.has(e.name) : pages.has(e.page) && passes(e.allowed, caller)));',
  "};",
  "",
].join("\n");
