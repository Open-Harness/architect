// Journey-author file: a starting world is made by declared operations, never by hand (D2 #4).
// A starting world may move the clock before it calls (M8-checks): Aaron joins on the last day of a long month.
import { Blueprint } from "orthograph";
import join from "../things/membership/verbs/join.ts";

/** Aaron joined on 31 January 2027 at nine UTC. */
export default Blueprint.startingWorld("member-since-the-31st", {
  cast: { aaron: Blueprint.anyone },
  makes: (s) => [s.clock.moveTo("2027-01-31T09:00:00Z"), s.aaron.run(join, { name: "Aaron" })],
  gives: (s) => ({ membership: s.last.membership }),
});
