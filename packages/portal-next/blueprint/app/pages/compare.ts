import { Blueprint } from "orthograph";
import home from "./home.ts";

export default Blueprint.page({
  description: "Every environment side by side.",
  route: { path: "/portal/compare", params: {  } },
  parent: home,
  allowed: [Blueprint.anyone],
});
