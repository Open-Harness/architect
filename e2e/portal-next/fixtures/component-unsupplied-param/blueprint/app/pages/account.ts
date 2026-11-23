import { Blueprint } from "orthograph";
import home from "./home.ts";
import linkList from "../components/link-list.ts";

export default Blueprint.page({
  description: "Holds the link list, which shows a read this route gives nothing to.",
  route: { path: "/account", params: {} },
  parent: home,
  allowed: [Blueprint.signedIn],
  components: [linkList],
});
