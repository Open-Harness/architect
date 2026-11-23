import { Blueprint } from "orthograph";

export default Blueprint.page({
  description: "The things as cards in the tree's order, and what each did in the window.",
  route: { path: "/portal", params: {  } },
  allowed: [Blueprint.anyone],
});
