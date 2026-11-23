import { Blueprint } from "orthograph";
import { Handle } from "../../things/handle/thing.ts";
import get from "../../things/profile/verbs/get.ts";
import add from "../../things/link/verbs/add.ts";
import release from "../../things/handle/verbs/release.ts";
import home from "./home.ts";

export default Blueprint.page({
  description: "A claimed name's public page and its links.",
  route: { path: "/@:handle/:extra", params: { handle: Handle.fields.name, extra: Blueprint.text() } },
  parent: home,
  allowed: [Blueprint.anyone],
  shows: [get],
  offers: [add, release],
});
