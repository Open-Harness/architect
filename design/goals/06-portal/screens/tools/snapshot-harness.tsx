import { mountShell } from "../../../../../packages/shell/src/index.ts";
import routes from "../derived/routes.json";
import navigation from "../derived/navigation.json";
import map from "../derived/map.json";
import palette from "../derived/palette.json";
const root = document.getElementById("root")!;
const m = mountShell(root, { routes: routes as any, navigation: navigation as any, map: map as any, palette: palette.entries as any, caller: "person",
  pages: { home: (el) => { el.textContent = "home"; } } });
(window as any).agent = m.agent;
