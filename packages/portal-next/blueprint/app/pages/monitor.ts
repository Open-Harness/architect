import { Blueprint } from "orthograph";
import home from "./home.ts";

export default Blueprint.page({
  description: "The alerts, issues and objectives the declarations imply.",
  route: { path: "/portal/monitor", params: {  } },
  parent: home,
  allowed: [Blueprint.anyone],
});
