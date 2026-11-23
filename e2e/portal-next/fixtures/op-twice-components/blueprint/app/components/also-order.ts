import { Blueprint } from "orthograph";
import order from "../../things/link/verbs/order.ts";

export default Blueprint.component({
  description: "A second way to order links.",
  offers: [order],
});
