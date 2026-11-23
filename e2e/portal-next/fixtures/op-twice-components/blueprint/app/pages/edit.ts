import { Blueprint } from "orthograph";
import { Handle } from "../../things/handle/thing.ts";
import profile from "./profile.ts";
import linkList from "../components/link-list.ts";
import alsoOrder from "../components/also-order.ts";

export default Blueprint.page({
  description: "Holds two components that both offer link.order.",
  route: { path: "/@:handle/edit", params: { handle: Handle.fields.name } },
  parent: profile,
  allowed: [Blueprint.signedIn],
  components: [linkList, alsoOrder],
});
