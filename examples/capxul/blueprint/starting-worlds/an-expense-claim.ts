// Journey-author file: a starting world is made by declared operations, never by hand (D2 #4).
import { Blueprint } from "orthograph";
import create from "../things/expense-claim/verbs/create.ts";

/** From an expense type: Olga has started a claim at Acme Trading, posted on 20 November 2026, with no expenses yet. */
export default Blueprint.startingWorld("an expense claim", {
  from: "an expense type",
  cast: { olga: Blueprint.signedIn },
  makes: (s) => [s.olga.run(create, { company: s.world.company, employee: s.world.employee, postingDate: "2026-11-20" })],
  gives: (s) => ({
    company: s.world.company,
    employee: s.world.employee,
    expenseClaimType: s.world.expenseClaimType,
    expenseClaim: s.last.expenseClaim,
  }),
});
