// Turns the app's files into `model.app`: every name resolved by identity, every page's effective lists worked out, every entry
// hashed, and the five refusals found on the way.
import type { AppComponent, AppPage, Operation, Read } from "orthograph";
import type { Model } from "#modules/model/types.js";
import type { AppFiles, AppModel, AppWorld, ComponentModel, PageModel } from "../types.ts";
import { cycles, duplicateRoutes, offerProblems, routeProblems, twiceProblems, type Item } from "./checks.ts";
import { hashOf } from "./hash.ts";
import { allowedOf, knownOf, paramOf } from "./known.ts";

const byName = <V>(m: ReadonlyMap<string, V>) => [...m].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
const once = (items: ReadonlyArray<Item>): ReadonlyArray<string> => [...new Set(items.map((i) => i.op))];

export const describeApp = (files: AppFiles, world: AppWorld, model: Model): { readonly app?: AppModel; readonly problems: ReadonlyArray<string> } => {
  const problems = [...files.problems];
  if (!files.present || files.app === undefined) return { problems };
  const known = knownOf(world);
  const pageNames = new Map<unknown, string>([...files.pages].map(([n, p]) => [p.declaration, n]));
  const componentNames = new Map<unknown, string>([...files.components].map(([n, c]) => [c.declaration, n]));
  const undeclared = (file: string, what: string) => (problems.push(`${file}: [app-undeclared-page] ${what} isn't a file of blueprint/app/pages/`), "?");
  const opName = (file: string, x: Operation | Read) =>
    known.operations.get(x) ?? (problems.push(`${file}: names an operation or read that isn't in the blueprint`), "?");
  const named = (file: string, list: ReadonlyArray<Operation | Read> | undefined): ReadonlyArray<Item> => (list ?? []).map((x) => ({ op: opName(file, x), file }));

  const components: Record<string, ComponentModel> = {};
  const ownItems = new Map<string, { readonly shows: ReadonlyArray<Item>; readonly offers: ReadonlyArray<Item> }>();
  for (const [name, { file, declaration: c }] of byName(files.components)) {
    const shows = named(file, c.shows);
    const offers = named(file, c.offers);
    ownItems.set(name, { shows, offers });
    const entry = { name, file, description: c.description, shows: once(shows), offers: once(offers) };
    components[name] = { ...entry, hash: hashOf(entry) };
  }

  const pages: Record<string, PageModel> = {};
  const facts: Array<{ readonly name: string; readonly file: string; readonly path: string }> = [];
  const parents = new Map<string, string>();
  const fileOf = new Map([...files.pages].map(([n, p]) => [n, p.file] as const));
  for (const [name, { file, declaration: p }] of byName(files.pages)) {
    const parent = typeof p.parent === "function" ? p.parent() : p.parent;
    const parentName = parent === undefined ? undefined : pageNames.get(parent) ?? undeclared(file, "its parent");
    if (parentName !== undefined && parentName !== "?") parents.set(name, parentName);
    const held = (p.components ?? []).map((c: AppComponent) => componentNames.get(c) ?? (problems.push(`${file}: holds a component that isn't a file of blueprint/app/components/`), "?"));
    const heldItems = held.map((c) => ownItems.get(c));
    const shows: ReadonlyArray<Item> = [...named(file, p.shows), ...heldItems.flatMap((i) => i?.shows ?? [])];
    const offers: ReadonlyArray<Item> = [...named(file, p.offers), ...heldItems.flatMap((i) => i?.offers ?? [])];
    const params = Object.fromEntries(Object.entries(p.route.params).map(([k, v]) => [k, paramOf(v, known, `${file} parameter ${k}`, problems)]));
    const allowed = p.allowed.map((a) => allowedOf(a, known, file, problems));
    const page = { name, file, path: p.route.path, params, allowed, shows, offers };
    problems.push(...routeProblems(page, model), ...offerProblems(page, model), ...twiceProblems(page));
    facts.push({ name, file, path: p.route.path });
    const entry = {
      name, file, description: p.description, route: { path: p.route.path, params },
      ...(parentName === undefined ? {} : { parent: parentName }),
      allowed, shows: once(shows), offers: once(offers), components: held,
    };
    pages[name] = { ...entry, hash: hashOf(entry) };
  }
  problems.push(...duplicateRoutes(facts), ...cycles(parents, fileOf));

  const { file, declaration: app } = files.app;
  const pageIn = (page: AppPage, what: string) => pageNames.get(page) ?? undeclared(file, what);
  const home = pageIn(app.home, "home");
  const nav = app.nav.map((g) => ({ title: g.title, pages: g.pages.map((p) => pageIn(p, `a page of the navigation group "${g.title}"`)), folded: g.folded }));
  const entry = { description: app.description, layout: app.layout.which, home, nav };
  const pageHashes = Object.fromEntries(Object.entries(pages).map(([n, p]) => [n, p.hash]));
  const componentHashes = Object.fromEntries(Object.entries(components).map(([n, c]) => [n, c.hash]));
  return { app: { ...entry, pages, components, hash: hashOf({ ...entry, pages: pageHashes, components: componentHashes }) }, problems };
};
