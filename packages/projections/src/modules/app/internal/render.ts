// The six files of `generated/app/`: four of data (routes, navigation, palette, the agent's map) and two of TypeScript (links,
// palette). The JSON files are two spaces of indent and a newline at the end.
import type { Model } from "@orthograph/compiler";
import type { RenderedFile } from "#modules/names/types.js";
import type { MapView } from "../types.ts";
import { linksModule } from "./links.ts";
import { paletteModule, paletteOf } from "./palette.ts";

const json = (path: string, value: unknown): RenderedFile => ({ path: `generated/app/${path}`, content: `${JSON.stringify(value, null, 2)}\n`, scaffold: false });
const ts = (path: string, content: string): RenderedFile => ({ path: `generated/app/${path}`, content, scaffold: false });

export const renderApp = (view: MapView, model: Model): ReadonlyArray<RenderedFile> => {
  const entries = paletteOf(view, model);
  return [
    ts("links.ts", linksModule(view)),
    json("map.json", {
      layout: view.layout,
      home: view.home,
      pages: view.pages.map((p) => ({
        name: p.name, path: p.path, params: p.params, description: p.description,
        ...(p.parent === undefined ? {} : { parent: p.parent }),
        allowed: p.allowed, shows: p.shows, offers: p.offers, components: p.components,
      })),
      groups: view.groups,
    }),
    json("navigation.json", { layout: view.layout, home: view.home, groups: view.groups }),
    json("palette.json", { entries }),
    ts("palette.ts", paletteModule(entries)),
    json("routes.json", {
      routes: view.pages.map((p) => ({
        page: p.name, path: p.path, params: p.params,
        ...(p.parent === undefined ? {} : { parent: p.parent }),
        allowed: p.allowed, description: p.description,
      })),
    }),
  ];
};
