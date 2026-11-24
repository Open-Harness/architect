// Journey-author file: a starting world is made by declared operations, never by hand (D2 #4).
import { Blueprint } from "orthograph";
import { owner } from "../things/company/roles.ts";
import { odd } from "../values/branches-names.ts";
import create from "../things/branch/verbs/create.ts";

/** From three branches: Ada has added a branch with an unusual name to Acme Logistics. */
export default Blueprint.startingWorld("four branches", {
  from: "three branches",
  cast: { ada: owner },
  makes: (s) => [s.ada.run(create, { company: s.world.otherCompany, branchName: odd })],
  gives: (s) => ({ company: s.world.company, otherCompany: s.world.otherCompany, boCompany: s.world.boCompany, branch: s.world.branch, longBranch: s.world.longBranch, otherBranch: s.world.otherBranch, oddBranch: s.last.branch }),
});
