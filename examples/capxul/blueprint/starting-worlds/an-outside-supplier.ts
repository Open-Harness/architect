// Journey-author file: a starting world is made by declared operations, never by hand (D2 #4).
import { Blueprint } from "orthograph";
import { owner } from "../things/company/roles.ts";
import createSupplier from "../things/supplier/verbs/create.ts";

/** From an outside customer: Ada has added Nile Fuel, a company in no group, to Acme Logistics' suppliers. */
export default Blueprint.startingWorld("an outside supplier", {
  from: "an outside customer",
  cast: { ada: owner },
  makes: (s) => [s.ada.run(createSupplier, { company: s.world.otherCompany, supplierName: "Nile Fuel", supplierType: "Company" })],
  gives: (s) => ({ otherSupplier: s.last.supplier }),
});
