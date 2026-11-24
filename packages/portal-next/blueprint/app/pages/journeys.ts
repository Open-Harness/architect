import { Blueprint } from "orthograph";
import home from "./home.ts";

export default Blueprint.page({
  description: "Every declared journey as a sequence of steps.",
  route: { path: "/portal/journeys", params: {  } },
  parent: home,
  allowed: [Blueprint.anyone],
});
