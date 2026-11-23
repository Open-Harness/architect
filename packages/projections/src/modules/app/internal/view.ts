// The map as one view: the declared one (`model.app`), or, when the blueprint declares none, the one derived from the things
// (K31 section 5): a home, a page per thing offering its operations, and a sidebar of the things. Derived, never stored.
import type { Model } from "@orthograph/compiler";
import type { MapView, ViewGroup, ViewPage } from "../types.ts";

const byName = (a: { readonly name: string }, b: { readonly name: string }) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
const PARAM = /:([A-Za-z_][A-Za-z0-9_]*)/g;
const paramsOf = (path: string): ReadonlyArray<string> => [...path.matchAll(PARAM)].map((m) => m[1]!);

const declared = (model: Model): MapView | undefined => {
  const app = model.app;
  if (app === undefined) return undefined;
  const pages: ReadonlyArray<ViewPage> = Object.values(app.pages).sort(byName).map((p) => ({
    name: p.name,
    path: p.route.path,
    params: paramsOf(p.route.path),
    description: p.description,
    ...(p.parent === undefined ? {} : { parent: p.parent }),
    allowed: p.allowed,
    shows: p.shows,
    offers: p.offers,
    components: p.components.map((c) => {
      const component = app.components[c];
      return { name: c, description: component?.description ?? "", shows: component?.shows ?? [], offers: component?.offers ?? [] };
    }),
  }));
  const pathOf = (page: string) => app.pages[page]?.route.path ?? "";
  const groups: ReadonlyArray<ViewGroup> = app.nav.map((g) => ({ title: g.title, folded: g.folded, pages: g.pages.map((page) => ({ page, path: pathOf(page) })) }));
  return { layout: app.layout, home: app.home, pages, groups };
};

const derived = (model: Model, project: string): MapView => {
  const anyone = [{ kind: "anyone" as const }];
  const things = Object.keys(model.things).sort();
  // The home takes the name `home` unless a thing has it; then `home-page`, and so on, so no two pages share a name.
  const home = [...Array(things.length + 1).keys()].map((i) => `home${"-page".repeat(i)}`).find((n) => !things.includes(n)) ?? "home";
  const pages: ReadonlyArray<ViewPage> = [
    { name: home, path: "/", params: [], description: `The things ${project} is made of.`, allowed: anyone, shows: [], offers: [], components: [] },
    ...things.map((thing): ViewPage => ({
      name: thing,
      path: `/things/${thing}`,
      params: [],
      description: model.things[thing]?.description || `The ${thing}, and what can be done to it.`,
      parent: home,
      allowed: anyone,
      shows: [],
      offers: Object.keys(model.operations).filter((o) => model.operations[o]?.thing === thing).sort(),
      components: [],
    })),
  ].sort(byName);
  return {
    layout: "sidebar",
    home,
    pages,
    groups: [{ title: "Things", folded: false, pages: things.map((t) => ({ page: t, path: `/things/${t}` })) }],
  };
};

export const viewOf = (model: Model, project: string): MapView => declared(model) ?? derived(model, project);
