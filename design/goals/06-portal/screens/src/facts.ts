// Every generated fact the screens quote is read here, from a file, never typed:
//   - examples/plugged-in/generated/model/model.json   (operations: name, description, allowed)
//   - derived/map.json, derived/links.ts, derived/palette.json   (the app projection's real output for Plugged In,
//     `goal-6/app-projection-build`, packages/projections/src/modules/app/, made by tools/derive.mjs)
//   - derived/snapshot-*.json   (UI SDK's `snapshot()` from the real shell, `goal-6/shell-build`, made by tools/snapshot.mjs)
// The run directory is screens/ (the build script sets it).
import { readFileSync } from "node:fs";
import { join } from "node:path";

const here = process.cwd();
const read = (p: string) => JSON.parse(readFileSync(p, "utf8")) as any;

export const MODEL_FILE = "examples/plugged-in/generated/model/model.json";
export const model = read(join(here, "../../../../", MODEL_FILE));
export const derivedMap = read(join(here, "derived/map.json"));
export const derivedPalette = read(join(here, "derived/palette.json")).entries as any[];
export const snapshotClosed = read(join(here, "derived/snapshot-closed.json")) as any[];
export const snapshotOpen = read(join(here, "derived/snapshot-palette-open.json")).snap as any[];

export type Allowed = { kind: string; role?: string };
export const allowedLabel = (a: Allowed): string => (a.kind === "role" ? `role ${a.role}` : a.kind);

export const op = (name: string): { name: string; description: string; allowed: Allowed[] } => {
  const o = model.operations[name];
  if (!o) throw new Error(`no operation ${name} in ${MODEL_FILE}`);
  return { name, description: o.description, allowed: o.allowed };
};

export interface Page {
  name: string;
  path: string;
  parent?: string;
  description: string;
  allowed: Allowed[];
  shows: string[];
  offers: string[];
  components: { name: string; description: string; shows: string[]; offers: string[] }[];
  /** typed link, as the projection writes it, or as K31's sketch implies */
  link: string;
  /** what the screen says about where this page's text comes from */
  source: "derived" | "K31" | "K36";
}

/** The derived default: the projection's own output, unchanged. */
export const derivedPages: Page[] = derivedMap.pages.map((p: any) => ({
  ...p,
  link: `links.${p.name}()`,
  source: "derived" as const,
}));
export const derivedGroups = derivedMap.groups as { title: string; folded: boolean; pages: { page: string; path: string }[] }[];

const anyone: Allowed[] = [{ kind: "anyone" }];

/**
 * K31's sketch of Plugged In's declared map (design/decisions/K31-app-map.md, "What you write") plus K36's link list on /edit.
 * The routes and the lists are the sketch's words; only the operations' descriptions and rules are read from model.json.
 * What the sketch leaves out (the edit and account pages' own details) is said on the screen, not filled in.
 */
export const declaredPages: Page[] = [
  { name: "home", path: "/", description: "(K31 names the page, not its words)", allowed: anyone, shows: [], offers: [], components: [], link: "links.home()", source: "K31" },
  {
    name: "profile", path: "/@:handle", parent: "home", description: "A claimed name's public page and its links.", allowed: anyone,
    shows: ["profile.get"], offers: ["link.add", "link.order", "handle.release"], components: [], link: "links.profile({ handle })", source: "K31",
  },
  {
    name: "edit", path: "/edit", parent: "home", description: "(K31 names the page, not its words)", allowed: [],
    shows: [], offers: [],
    components: [{ name: "linkList", description: "Your links, in order; move one or remove it.", shows: ["profile.get"], offers: ["link.order", "link.remove"] }],
    link: "links.edit()", source: "K36",
  },
  { name: "account", path: "(not sketched)", parent: "home", description: "(K31 names the page, not its words)", allowed: [], shows: [], offers: [], components: [], link: "links.account()", source: "K31" },
];
export const declaredGroups = [
  { title: "Your page", folded: false, pages: [{ page: "profile", path: "/@:handle" }, { page: "edit", path: "/edit" }] },
  { title: "Settings", folded: true, pages: [{ page: "account", path: "(not sketched)" }] },
];
