import { Blueprint } from "orthograph";
import home from "./home.ts";

export default Blueprint.page({
  description: "Every refusal code, counted in the window.",
  route: { path: "/portal/reference/refusals", params: {  } },
  parent: home,
  allowed: [Blueprint.anyone],
});
