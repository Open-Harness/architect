// Journey-author file: a starting world is made by declared operations, never by hand (D2 #4).
import { Blueprint } from "orthograph";
import { owner } from "../things/company/roles.ts";
import create from "../things/kra/verbs/create.ts";

/** From an outside employee: Ada has added the KRA Quality to Acme Trading. */
export default Blueprint.startingWorld("a kra", {
  from: "an outside employee",
  cast: { ada: owner },
  makes: (s) => [s.ada.run(create, { company: s.world.company, title: "Quality" })],
  gives: (s) => ({ kra: s.last.kra }),
});
