import { Blueprint } from "orthograph";
import home from "./home.ts";

export default Blueprint.page({
  description: "One call's trace: its structure and timing, never a value.",
  route: { path: "/portal/traces/:id", params: { id: Blueprint.text() } },
  parent: home,
  allowed: [Blueprint.anyone],
});
