import { Blueprint } from "orthograph";
import home from "./home.ts";

export default Blueprint.page({
  description: "One declared environment: its summary, its fields and its proof.",
  route: { path: "/portal/environments/:name", params: { name: Blueprint.text() } },
  parent: home,
  allowed: [Blueprint.anyone],
});
