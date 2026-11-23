import { Blueprint } from "orthograph";
import { linkOwner } from "../../things/link/roles.ts";
import remove from "../../things/link/verbs/remove.ts";
import home from "./home.ts";

export default Blueprint.page({
  description: "Offers what its own role may call; it shows no read.",
  route: { path: "/links/:link", params: { link: Blueprint.text() } },
  parent: home,
  allowed: [linkOwner],
  offers: [remove],
});
