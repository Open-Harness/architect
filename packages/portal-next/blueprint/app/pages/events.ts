import { Blueprint } from "orthograph";
import home from "./home.ts";

export default Blueprint.page({
  description: "Every event a thing emits.",
  route: { path: "/portal/reference/events", params: {  } },
  parent: home,
  allowed: [Blueprint.anyone],
});
