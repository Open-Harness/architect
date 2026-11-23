import { Blueprint } from "orthograph";
import { Handle } from "../../things/handle/thing.ts";
import get from "../../things/profile/verbs/get.ts";
import add from "../../things/link/verbs/add.ts";
import release from "../../things/handle/verbs/release.ts";
import edit from "./edit.ts";

export default Blueprint.page({
  description: "A claimed name's public page; its parent is the edit page, which is its child.",
  route: { path: "/@:handle", params: { handle: Handle.fields.name } },
  parent: () => edit,
  allowed: [Blueprint.anyone],
  shows: [get],
  offers: [add, release],
});
