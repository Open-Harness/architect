// Journey-author file: a starting world is made by declared operations, never by hand (D2 #4).
import { Blueprint } from "orthograph";
import { owner } from "../things/company/roles.ts";
import createStructure from "../things/salary-structure/verbs/create.ts";

/** From a pension component: Ada has drafted Engineers: Basic at its own 3,000 USDC and Housing at 500 USDC, less Pension at its own 150 USDC. It is still a draft. */
export default Blueprint.startingWorld("a salary structure", {
  from: "a pension component",
  cast: { ada: owner },
  makes: (s) => [
    s.ada.run(createStructure, { company: s.world.company, salaryStructureName: "Engineers", earnings: [{ salaryComponent: s.world.basic, amount: 0n }, { salaryComponent: s.world.housing, amount: 500_000_000n }], deductions: [{ salaryComponent: s.world.pensionComponent, amount: 0n }] }),
  ],
  gives: (s) => ({ salaryStructure: s.last.salaryStructure }),
});
