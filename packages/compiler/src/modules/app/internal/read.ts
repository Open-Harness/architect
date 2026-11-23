// Reads `blueprint/app/`: the app, a page for each file of `pages/` and a component for each file of `components/`, each
// named by its path. Any other file under `app/` is the app's own helper and is left alone.
import type { App, AppComponent, AppPage } from "orthograph";
import type { LoadedFile } from "#modules/source/types.js";
import type { AppFiles } from "../types.ts";

const NAME = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
const kindOf = (x: unknown): string | undefined =>
  typeof x === "object" && x !== null ? ((x as { kind?: unknown }).kind as string | undefined) : undefined;

export const setAside = (files: ReadonlyArray<LoadedFile>): { readonly app: AppFiles; readonly rest: ReadonlyArray<LoadedFile> } => {
  const rest: Array<LoadedFile> = [];
  const pages = new Map<string, { file: string; declaration: AppPage }>();
  const components = new Map<string, { file: string; declaration: AppComponent }>();
  const problems: Array<string> = [];
  let app: { file: string; declaration: App } | undefined;
  let present = false;
  for (const f of files) {
    const parts = f.path.replace(/\.(ts|js)$/, "").split("/");
    if (parts[0] !== "app") {
      rest.push(f);
      continue;
    }
    present = true;
    const file = `blueprint/${f.path}`;
    const d = f.exports["default"];
    if (parts.length === 2 && parts[1] === "app") {
      if (kindOf(d) !== "app") problems.push(`${file}: the default export must be a Blueprint.app`);
      else app = { file, declaration: d as App };
    } else if (parts.length === 3 && (parts[1] === "pages" || parts[1] === "components")) {
      const name = parts[2]!;
      const what = parts[1] === "pages" ? "page" : "component";
      if (!NAME.test(name)) problems.push(`${file}: ${what} "${name}" must be lowercase words joined by dashes`);
      if (what === "page") {
        if (kindOf(d) !== "app-page") problems.push(`${file}: the default export must be a Blueprint.page`);
        else pages.set(name, { file, declaration: d as AppPage });
      } else if (kindOf(d) !== "app-component") problems.push(`${file}: the default export must be a Blueprint.component`);
      else components.set(name, { file, declaration: d as AppComponent });
    }
  }
  if (present && app === undefined && !problems.some((p) => p.endsWith("must be a Blueprint.app"))) problems.push("blueprint/app/: has no app.ts");
  return { app: { present, app, pages, components, problems }, rest };
};
