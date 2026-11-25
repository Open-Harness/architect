// Journey-author file: a starting world is made by declared operations, never by hand (D2 #4).
import { Blueprint } from "orthograph";
import { owner } from "../things/company/roles.ts";
import create from "../things/kra/verbs/create.ts";

/** From a second feedback criteria: Ada has added the KRA Safety to Acme Logistics, her other company. */
export default Blueprint.startingWorld("an outside kra", {
  from: "a second feedback criteria",
  cast: { ada: owner },
  makes: (s) => [s.ada.run(create, { company: s.world.otherCompany, title: "Safety" })],
  gives: (s) => ({ outsideKra: s.last.kra }),
});
