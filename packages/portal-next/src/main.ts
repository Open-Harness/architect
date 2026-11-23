// The new client's entry and composition root (K19): the one file that touches the window and runs an effect. It reads the app's map as the app
// projection generated it (routes, navigation, map, palette, typed links), hands the shell a painter for each page, the palette's extra rows and its
// own 404, and starts reading the data API once. The shell matches every address; nothing here does. Never imported by the server half.
import "@ui-sdk/core/web.css";
import "@orthograph/theme/theme.css";
import "./portal.css";
import { Effect } from "effect";
import { mountShell, type Mounted, type PaletteEntry } from "@orthograph/shell";
import map from "../generated/app/map.json";
import navigation from "../generated/app/navigation.json";
import palette from "../generated/app/palette.json";
import routes from "../generated/app/routes.json";
import { links } from "../generated/app/links.ts";
import { Data } from "./modules/data/service.ts";
import { Panels } from "./modules/panels/service.ts";
import { Pages } from "./modules/pages/service.ts";

const root = document.getElementById("root");
if (root !== null) {
  const store = Data.store();
  // The pages move through the shell's router; it exists once the shell is mounted, which is before any page can be clicked.
  let shell: Mounted | undefined;
  const go = (href: string): void => { shell?.navigate(href); };
  const deps = { store, env: { navigation, links, go } };
  shell = mountShell(root, {
    routes, navigation, map, palette: palette.entries as ReadonlyArray<PaletteEntry>, caller: "anonymous",
    pages: Pages.painters(deps), notFound: Pages.notFound(deps), extra: Panels.extraSource(store, links),
  });
  void Effect.runPromise(Data.loaded()).then(store.settle);
}
