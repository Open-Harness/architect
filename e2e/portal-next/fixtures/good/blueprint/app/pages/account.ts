import { Blueprint } from "orthograph";
import home from "./home.ts";

export default Blueprint.page({
  description: "Your account.",
  route: { path: "/account", params: {} },
  parent: home,
  allowed: [Blueprint.signedIn],
});
