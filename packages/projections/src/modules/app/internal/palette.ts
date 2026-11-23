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
  '  | { readonly kind: "signed-in"; readonly via?: ReadonlyArray<string> }',
  '  | { readonly kind: "system" }',
  '  | { readonly kind: "keeper" }',
  '  | { readonly kind: "role"; readonly role: string; readonly via?: ReadonlyArray<string>; readonly service?: string }',
  '  | { readonly kind: "role-of"; readonly role: string; readonly path: string; readonly via?: ReadonlyArray<string>; readonly service?: string };',
  "",
  "export type PaletteEntry =",
  '  | { readonly kind: "page"; readonly name: string; readonly path: string; readonly description: string; readonly allowed: ReadonlyArray<Allowed> }',
  '  | { readonly kind: "operation"; readonly name: string; readonly page: string; readonly component: string | null; readonly description: string; readonly allowed: ReadonlyArray<Allowed> };',
  "",
  "export type Caller = \"anonymous\" | \"person\";",
  "",
  `export const entries: ReadonlyArray<PaletteEntry> = ${JSON.stringify(entries, null, 2)};`,
  "",
  "/**",
  " * The rule. An anonymous caller passes only `anyone`. A person passes `anyone` and `signed-in`. A role (`role`, or `role-of` by its",
  " * role's name) is decided on an instance: it passes only when `roles` (the names the caller",
  " * holds, such as `link.linkOwner`) has it, and no `roles` means none held. `system`, `keeper` and a service role are never a person; `via` (the ways in a mount kept) does not change who may open a page, so the entry's own rule decides. Nobody passes an empty `allowed`.",
  " */",
  "const passes = (allowed: ReadonlyArray<Allowed>, caller: Caller, roles?: ReadonlyArray<string>): boolean =>",
  "  allowed.some((a) => {",
  '    if (a.kind === "anyone") return true;',
  '    if (caller !== "person") return false;',
  '    if (a.kind === "system" || a.kind === "keeper") return false;',
  '    if (a.kind === "signed-in") return true;',
  '    return a.service === undefined && (roles ?? []).includes(a.role);',
  "  });",
  "",
  "/** What the caller may open and call: a page whose `allowed` they pass, and an operation of such a page whose own `allowed` they pass. */",
  "export const visibleTo = (caller: Caller, roles?: ReadonlyArray<string>): ReadonlyArray<PaletteEntry> => {",
  '  const pages = new Set(entries.flatMap((e) => (e.kind === "page" && passes(e.allowed, caller, roles) ? [e.name] : [])));',
  '  return entries.filter((e) => (e.kind === "page" ? pages.has(e.name) : pages.has(e.page) && passes(e.allowed, caller, roles)));',
  "};",
  "",
].join("\n");
