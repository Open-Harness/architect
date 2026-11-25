// Journey-author file: a starting world is made by declared operations, never by hand (D2 #4).
import { Blueprint } from "orthograph";
import { owner } from "../things/company/roles.ts";
import create from "../things/kra/verbs/create.ts";

/** From a kra: Ada has added the KRA Development to Acme Trading too. */
export default Blueprint.startingWorld("a second kra", {
  from: "a kra",
  cast: { ada: owner },
  makes: (s) => [s.ada.run(create, { company: s.world.company, title: "Development" })],
  gives: (s) => ({ otherKra: s.last.kra }),
});
