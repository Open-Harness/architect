import { Blueprint } from "orthograph";
import ghost from "../ghost.ts";

export default Blueprint.page({
  description: "Its parent is not a declared page.",
  route: { path: "/account", params: {} },
  parent: ghost,
  allowed: [Blueprint.signedIn],
});
