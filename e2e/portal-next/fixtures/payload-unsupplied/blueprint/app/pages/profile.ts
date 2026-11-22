import { Blueprint } from "orthograph";
import get from "../../things/profile/verbs/get.ts";
import add from "../../things/link/verbs/add.ts";
import release from "../../things/handle/verbs/release.ts";
import home from "./home.ts";

export default Blueprint.page({
  description: "Your own page, but nothing supplies the handle the read needs.",
  route: { path: "/me", params: {} },
  parent: home,
  allowed: [Blueprint.anyone],
  shows: [get],
  offers: [add, release],
});
