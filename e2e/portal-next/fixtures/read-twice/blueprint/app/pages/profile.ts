import { Blueprint } from "orthograph";
import { Handle } from "../../things/handle/thing.ts";
import get from "../../things/profile/verbs/get.ts";
import add from "../../things/link/verbs/add.ts";
import release from "../../things/handle/verbs/release.ts";
import home from "./home.ts";
import linkList from "../components/link-list.ts";

export default Blueprint.page({
  description: "Shows the read itself and holds a component that shows it too.",
  route: { path: "/@:handle", params: { handle: Handle.fields.name } },
  parent: home,
  allowed: [Blueprint.anyone],
  shows: [get],
  offers: [add, release],
  components: [linkList],
});
