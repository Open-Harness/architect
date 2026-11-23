import { Blueprint } from "orthograph";
import home from "./home.ts";

export default Blueprint.page({
  description: "A page over the portal's own data: it shows no read, so its parameter is typed with a value.",
  route: { path: "/things/:name", params: { name: Blueprint.text() } },
  parent: home,
  allowed: [Blueprint.anyone],
});
