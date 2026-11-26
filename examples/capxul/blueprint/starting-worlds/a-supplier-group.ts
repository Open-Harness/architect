// Journey-author file: a starting world is made by declared operations, never by hand (D2 #4).
import { Blueprint } from "orthograph";
import { owner } from "../things/company/roles.ts";
import createGroup from "../things/supplier-group/verbs/create.ts";

/** From all supplier groups: Ada has added Services, a ledger supplier group under it. */
export default Blueprint.startingWorld("a supplier group", {
  from: "all supplier groups",
  cast: { ada: owner },
  makes: (s) => [s.ada.run(createGroup, { company: s.world.company, supplierGroupName: "Services", parentSupplierGroup: s.world.allSupplierGroups, isGroup: false })],
  gives: (s) => ({ supplierGroup: s.last.supplierGroup }),
});
