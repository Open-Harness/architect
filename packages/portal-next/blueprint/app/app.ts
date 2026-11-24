import { Blueprint } from "orthograph";
import access from "./pages/access.ts";
import compare from "./pages/compare.ts";
import environment from "./pages/environment.ts";
import events from "./pages/events.ts";
import home from "./pages/home.ts";
import journeys from "./pages/journeys.ts";
import machines from "./pages/machines.ts";
import monitor from "./pages/monitor.ts";
import plugins from "./pages/plugins.ts";
import refusals from "./pages/refusals.ts";
import thing from "./pages/thing.ts";
import values from "./pages/values.ts";
import worlds from "./pages/worlds.ts";

// The portal's map (design/portal.md): the five groups are the icon rail's five panels, in order. The portal draws its own frame, so the layout is `none`.
export default Blueprint.app({
  description: "Look inside a project: its things, operations, environments and what they did in the window.",
  layout: Blueprint.layout.none,
  home,
  nav: [
    Blueprint.nav.group({ title: "things", pages: [thing] }),
    Blueprint.nav.group({ title: "proof", pages: [environment, compare, journeys, worlds] }),
    Blueprint.nav.group({ title: "reference", pages: [access, refusals, events, values, machines] }),
    Blueprint.nav.group({ title: "plugins", pages: [plugins] }),
    Blueprint.nav.group({ title: "monitor", pages: [monitor] }),
  ],
});
