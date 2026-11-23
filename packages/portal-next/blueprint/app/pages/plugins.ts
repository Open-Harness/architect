import { Blueprint } from "orthograph";
import home from "./home.ts";

export default Blueprint.page({
  description: "A card per mounted plugin, then the stores and what each runs on.",
  route: { path: "/portal/plugins", params: {  } },
  parent: home,
  allowed: [Blueprint.anyone],
});
