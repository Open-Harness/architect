// Journey-author file: a starting world is made by declared operations, never by hand (D2 #4).
import { Blueprint } from "orthograph";
import { owner } from "../things/company/roles.ts";
import createCustomer from "../things/customer/verbs/create.ts";

/** From a supplier group: Ada has added Kibo Stores, a company, to Acme Trading's customers, in Commercial. */
export default Blueprint.startingWorld("a customer", {
  from: "a supplier group",
  cast: { ada: owner },
  makes: (s) => [s.ada.run(createCustomer, { company: s.world.company, customerName: "Kibo Stores", customerType: "Company", customerGroup: s.world.customerGroup })],
  gives: (s) => ({ customer: s.last.customer }),
});
