import { Blueprint } from "orthograph";
import home from "./home.ts";

export default Blueprint.page({
  description: "Every lifecycle.",
  route: { path: "/portal/reference/machines", params: {  } },
  parent: home,
  allowed: [Blueprint.anyone],
});
