import { Blueprint } from "orthograph";
import { handleOwner } from "../../things/handle/roles.ts";
import order from "../../things/link/verbs/order.ts";
import home from "./home.ts";

export default Blueprint.page({
  description: "Offers an operation none of its roles may call.",
  route: { path: "/account", params: {} },
  parent: home,
  allowed: [handleOwner],
  offers: [order],
});
