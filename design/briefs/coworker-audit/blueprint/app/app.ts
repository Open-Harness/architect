import { Blueprint } from "orthograph";
import system from "./pages/system.ts";
import inbox from "./pages/inbox.ts";
import search from "./pages/search.ts";

// The shell from first-principles 34 and 35: the sidebar is for what runs. System, Inbox, Search, then the tree of
// managers, folding out under the root as deep as it goes. What managers use is under Settings.
// K31's form, built for the portal (`packages/orthograph/src/modules/app`); no example app has one yet.
export default Blueprint.app({
  description: "Co-workers that keep an outcome moving, and come to you only when a person is needed.",
  layout: Blueprint.layout.sidebar,
  home: system,
  nav: [
    Blueprint.nav.group({ title: "", pages: [system, inbox, search] }),
    // new: a nav group filled from a tree read, one entry per Manager under its `above`. K31's nav takes pages only.
    Blueprint.todo("GAP trees: the managers' tree as navigation"),
  ],
});
