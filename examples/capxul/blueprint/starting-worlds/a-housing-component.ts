// Journey-author file: a starting world is made by declared operations, never by hand (D2 #4).
import { Blueprint } from "orthograph";
import { owner } from "../things/company/roles.ts";
import createComponent from "../things/salary-component/verbs/create.ts";

/** From a basic component: Ada has added Housing, an earning with no default amount, booked to Salaries. */
export default Blueprint.startingWorld("a housing component", {
  from: "a basic component",
  cast: { ada: owner },
  makes: (s) => [
    s.ada.run(createComponent, { company: s.world.company, salaryComponent: "Housing", type: "Earning", amount: 0n, account: s.world.salaries }),
  ],
  gives: (s) => ({ housing: s.last.salaryComponent }),
});
