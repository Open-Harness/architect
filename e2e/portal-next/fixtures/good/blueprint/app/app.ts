import { Blueprint } from "orthograph";
import home from "./pages/home.ts";
import profile from "./pages/profile.ts";
import edit from "./pages/edit.ts";
import account from "./pages/account.ts";
import thing from "./pages/thing.ts";

export default Blueprint.app({
  description: "Claim a name and keep a public page of links.",
  layout: Blueprint.layout.sidebar,
  home,
  nav: [
    Blueprint.nav.group({ title: "Your page", pages: [profile, edit] }),
    Blueprint.nav.group({ title: "Settings", pages: [account], folded: true }),
    Blueprint.nav.group({ title: "Things", pages: [thing] }),
  ],
});
