// Journey-author file: a starting world is made by declared operations, never by hand (D2 #4).
import { Blueprint } from "orthograph";
import { owner } from "../things/company/roles.ts";
import create from "../things/expense-claim-type/verbs/create.ts";

/** From an expense claim: Ada has added a second expense type, Lodging, to Acme Trading. */
export default Blueprint.startingWorld("an expense claim with two types", {
  from: "an expense claim",
  cast: { ada: owner },
  makes: (s) => [s.ada.run(create, { company: s.world.company, expenseType: "Lodging" })],
  gives: (s) => ({
    company: s.world.company,
    employee: s.world.employee,
    expenseClaimType: s.world.expenseClaimType,
    lodging: s.last.expenseClaimType,
    expenseClaim: s.world.expenseClaim,
  }),
});
