import { Blueprint } from "orthograph";
import home from "./home.ts";

export default Blueprint.page({
  description: "Every value a field can take.",
  route: { path: "/portal/reference/values", params: {  } },
  parent: home,
  allowed: [Blueprint.anyone],
});
