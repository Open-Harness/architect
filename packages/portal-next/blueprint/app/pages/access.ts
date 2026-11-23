import { Blueprint } from "orthograph";
import home from "./home.ts";

export default Blueprint.page({
  description: "Who may call what.",
  route: { path: "/portal/reference/access", params: {  } },
  parent: home,
  allowed: [Blueprint.anyone],
});
