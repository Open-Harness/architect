// Journey-author file: a starting world is made by declared operations, never by hand (D2 #4).
import { Blueprint } from "orthograph";
import { owner } from "../things/company/roles.ts";
import create from "../things/expense-claim-type/verbs/create.ts";

/** From an employee: Ada has added the expense type Travel to Acme Trading. */
export default Blueprint.startingWorld("an expense type", {
  from: "an employee",
  cast: { ada: owner },
  makes: (s) => [s.ada.run(create, { company: s.world.company, expenseType: "Travel" })],
  gives: (s) => ({ company: s.world.company, employee: s.world.employee, expenseClaimType: s.last.expenseClaimType }),
});
