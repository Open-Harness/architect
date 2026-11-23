import { Blueprint } from "orthograph";
import get from "../../things/profile/verbs/get.ts";
import order from "../../things/link/verbs/order.ts";
import remove from "../../things/link/verbs/remove.ts";

export default Blueprint.component({
  description: "Your links, in order; move one or remove it.",
  shows: [get],
  offers: [order, remove],
});
