// Journey-author file: a starting world is made by declared operations, never by hand (D2 #4).
import { Blueprint } from "orthograph";
import { owner } from "../things/company/roles.ts";
import create from "../things/branch/verbs/create.ts";

/** From two companies: Ada has added the branch Nairobi to Acme Trading. */
export default Blueprint.startingWorld("a branch", {
  from: "two companies",
  cast: { ada: owner },
  makes: (s) => [s.ada.run(create, { company: s.world.company, branchName: "Nairobi" })],
  gives: (s) => ({ company: s.world.company, otherCompany: s.world.otherCompany, branch: s.last.branch }),
});
