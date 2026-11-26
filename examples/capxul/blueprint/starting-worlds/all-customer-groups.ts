// Journey-author file: a starting world is made by declared operations, never by hand (D2 #4).
import { Blueprint } from "orthograph";
import { owner } from "../things/company/roles.ts";
import createGroup from "../things/customer-group/verbs/create.ts";

/** From logistics haulage: Ada has added All Customer Groups, the root customer group of Acme Trading. */
export default Blueprint.startingWorld("all customer groups", {
  from: "logistics haulage",
  cast: { ada: owner },
  makes: (s) => [s.ada.run(createGroup, { company: s.world.company, customerGroupName: "All Customer Groups", isGroup: true })],
  gives: (s) => ({ allCustomerGroups: s.last.customerGroup }),
});
