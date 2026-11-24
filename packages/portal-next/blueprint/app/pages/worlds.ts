import { Blueprint } from "orthograph";
import home from "./home.ts";

export default Blueprint.page({
  description: "The starting worlds, and the journeys that start from each.",
  route: { path: "/portal/starting-worlds", params: {  } },
  parent: home,
  allowed: [Blueprint.anyone],
});
