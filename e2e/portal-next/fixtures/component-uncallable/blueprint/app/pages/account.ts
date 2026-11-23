import { Blueprint } from "orthograph";
import { Handle } from "../../things/handle/thing.ts";
import { handleOwner } from "../../things/handle/roles.ts";
import home from "./home.ts";
import linkList from "../components/link-list.ts";

export default Blueprint.page({
  description: "Holds the link list, whose offers its role cannot call.",
  route: { path: "/@:handle/account", params: { handle: Handle.fields.name } },
  parent: home,
  allowed: [handleOwner],
  components: [linkList],
});
