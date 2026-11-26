// Journey-author file: a starting world is made by declared operations, never by hand (D2 #4).
import { Blueprint } from "orthograph";
import { owner } from "../things/company/roles.ts";
import createComponent from "../things/salary-component/verbs/create.ts";

/** From a housing component: Ada has added Pension, a deduction of 150 USDC by default, booked to Pension Payable. */
export default Blueprint.startingWorld("a pension component", {
  from: "a housing component",
  cast: { ada: owner },
  makes: (s) => [
    s.ada.run(createComponent, { company: s.world.company, salaryComponent: "Pension", type: "Deduction", amount: 150_000_000n, account: s.world.pension }),
  ],
  gives: (s) => ({ pensionComponent: s.last.salaryComponent }),
});
