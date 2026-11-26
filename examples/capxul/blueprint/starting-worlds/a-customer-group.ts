// Journey-author file: a starting world is made by declared operations, never by hand (D2 #4).
import { Blueprint } from "orthograph";
import { owner } from "../things/company/roles.ts";
import createGroup from "../things/customer-group/verbs/create.ts";

/** From all customer groups: Ada has added Commercial, a ledger customer group under it. */
export default Blueprint.startingWorld("a customer group", {
  from: "all customer groups",
  cast: { ada: owner },
  makes: (s) => [s.ada.run(createGroup, { company: s.world.company, customerGroupName: "Commercial", parentCustomerGroup: s.world.allCustomerGroups, isGroup: false })],
  gives: (s) => ({ customerGroup: s.last.customerGroup }),
});
