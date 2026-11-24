// Journey-author file: a starting world is made by declared operations, never by hand (D2 #4).
import { Blueprint } from "orthograph";
import { owner } from "../things/company/roles.ts";
import create from "../things/branch/verbs/create.ts";

/** From two branches: Ada has added Nairobi to Acme Logistics too. */
export default Blueprint.startingWorld("three branches", {
  from: "two branches",
  cast: { ada: owner },
  makes: (s) => [s.ada.run(create, { company: s.world.otherCompany, branchName: "Nairobi" })],
  gives: (s) => ({ company: s.world.company, otherCompany: s.world.otherCompany, boCompany: s.world.boCompany, branch: s.world.branch, longBranch: s.world.longBranch, otherBranch: s.last.branch }),
});
