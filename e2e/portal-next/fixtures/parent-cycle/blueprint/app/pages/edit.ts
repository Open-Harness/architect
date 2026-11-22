import { Blueprint } from "orthograph";
import { Handle } from "../../things/handle/thing.ts";
import profile from "./profile.ts";
import linkList from "../components/link-list.ts";

export default Blueprint.page({
  description: "Edit your page.",
  route: { path: "/@:handle/edit", params: { handle: Handle.fields.name } },
  parent: () => profile,
  allowed: [Blueprint.signedIn],
  components: [linkList],
});
