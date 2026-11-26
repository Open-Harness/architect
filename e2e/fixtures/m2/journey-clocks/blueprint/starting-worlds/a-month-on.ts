// Journey-author file (m2 check 12): a starting world whose day is a month after the environment's start.
import { Blueprint } from "orthograph";
import create from "../things/organization/verbs/create.ts";
import today from "../things/system/verbs/today.ts";

/**
 * A month passes; then Bo, whom no journey names, is still signed in, and Ada founds an organisation and owns it. Both are
 * signed in again after the starting world's own clock step.
 */
export default Blueprint.startingWorld("a month on", {
  cast: { ada: Blueprint.signedIn, bo: Blueprint.signedIn },
  makes: (s) => [s.clock.advance("1 month"), s.bo.run(today, {}), s.ada.run(create, { name: "A Month On", cap: 1000n })],
  gives: (s) => ({ ada: s.ada.person, bo: s.bo.person, organization: s.last.organization }),
});
