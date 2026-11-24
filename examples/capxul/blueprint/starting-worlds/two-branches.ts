// Journey-author file: a starting world is made by declared operations, never by hand (D2 #4).
import { Blueprint } from "orthograph";
import { owner } from "../things/company/roles.ts";
import { long } from "../values/branches-names.ts";
import create from "../things/branch/verbs/create.ts";

/** From a branch: Ada has added a branch with the longest name allowed to Acme Trading. */
export default Blueprint.startingWorld("two branches", {
  from: "a branch",
  cast: { ada: owner },
  makes: (s) => [s.ada.run(create, { company: s.world.company, branchName: long })],
  gives: (s) => ({ company: s.world.company, otherCompany: s.world.otherCompany, branch: s.world.branch, longBranch: s.last.branch }),
});
