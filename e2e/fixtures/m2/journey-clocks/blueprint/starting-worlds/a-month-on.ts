// Journey-author file (m2 check 10): a starting world whose day is a month after the environment's start.
import { Blueprint } from "orthograph";
import create from "../things/organization/verbs/create.ts";

/** A month passes, then Ada founds an organisation: she is still signed in after the starting world's own clock step. */
export default Blueprint.startingWorld("a month on", {
  cast: { ada: Blueprint.signedIn },
  makes: (s) => [s.clock.advance("1 month"), s.ada.run(create, { name: "A Month On", cap: 1000n })],
  gives: (s) => ({ ada: s.ada.person, organization: s.last.organization }),
});
