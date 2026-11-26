// Journey-author file: a starting world is made by declared operations, never by hand (D2 #4).
import { Blueprint } from "orthograph";
import { owner } from "../things/company/roles.ts";
import createGroup from "../things/supplier-group/verbs/create.ts";

/** From a customer group: Ada has added All Supplier Groups, the root supplier group of Acme Trading. */
export default Blueprint.startingWorld("all supplier groups", {
  from: "a customer group",
  cast: { ada: owner },
  makes: (s) => [s.ada.run(createGroup, { company: s.world.company, supplierGroupName: "All Supplier Groups", isGroup: true })],
  gives: (s) => ({ allSupplierGroups: s.last.supplierGroup }),
});
