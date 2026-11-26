// Journey-author file: a starting world is made by declared operations, never by hand (D2 #4).
import { Blueprint } from "orthograph";
import { owner } from "../things/company/roles.ts";
import createComponent from "../things/salary-component/verbs/create.ts";

/** From a second paid employee: Ada has added Basic, an earning of 3,000 USDC by default, booked to Salaries. */
export default Blueprint.startingWorld("a basic component", {
  from: "a second paid employee",
  cast: { ada: owner },
  makes: (s) => [
    s.ada.run(createComponent, { company: s.world.company, salaryComponent: "Basic", type: "Earning", amount: 3_000_000_000n, account: s.world.salaries }),
  ],
  gives: (s) => ({ basic: s.last.salaryComponent }),
});
