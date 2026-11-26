// Journey-author file: a starting world is made by declared operations, never by hand (D2 #4).
import { Blueprint } from "orthograph";
import { owner } from "../things/company/roles.ts";
import createCustomer from "../things/customer/verbs/create.ts";

/** From a supplier: Ada has added Kampala Traders, a company in no group, to Acme Logistics' customers. */
export default Blueprint.startingWorld("an outside customer", {
  from: "a supplier",
  cast: { ada: owner },
  makes: (s) => [s.ada.run(createCustomer, { company: s.world.otherCompany, customerName: "Kampala Traders", customerType: "Company" })],
  gives: (s) => ({ otherCustomer: s.last.customer }),
});
