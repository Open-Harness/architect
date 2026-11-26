// Journey-author file: a starting world is made by declared operations, never by hand (D2 #4).
import { Blueprint } from "orthograph";
import { owner } from "../things/company/roles.ts";
import createAccount from "../things/account/verbs/create.ts";

/** From a fiscal year: Ada has added Liabilities, a root group of the root type Liability, to Acme Trading's chart. */
export default Blueprint.startingWorld("a liabilities group", {
  from: "a fiscal year",
  cast: { ada: owner },
  makes: (s) => [
    s.ada.run(createAccount, { company: s.world.company, accountName: "Liabilities", isGroup: true, rootType: "Liability" }),
  ],
  gives: (s) => ({ liabilities: s.last.account }),
});
