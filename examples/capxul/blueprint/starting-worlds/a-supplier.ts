// Journey-author file: a starting world is made by declared operations, never by hand (D2 #4).
import { Blueprint } from "orthograph";
import { owner } from "../things/company/roles.ts";
import createSupplier from "../things/supplier/verbs/create.ts";

/** From a customer: Ada has added Mara Office Rentals, a company, to Acme Trading's suppliers, in Services. */
export default Blueprint.startingWorld("a supplier", {
  from: "a customer",
  cast: { ada: owner },
  makes: (s) => [s.ada.run(createSupplier, { company: s.world.company, supplierName: "Mara Office Rentals", supplierType: "Company", supplierGroup: s.world.supplierGroup })],
  gives: (s) => ({ supplier: s.last.supplier }),
});
