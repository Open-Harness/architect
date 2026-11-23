import { Blueprint } from "orthograph";
import home from "./home.ts";

export default Blueprint.page({
  description: "One thing: its lifecycle, its operations, its rules, events and errors.",
  route: { path: "/portal/things/:name", params: { name: Blueprint.text() } },
  parent: home,
  allowed: [Blueprint.anyone],
});
