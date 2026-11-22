// Journey-author file: a starting world is made by declared operations, never by hand (D2 #4).
import { Blueprint } from "orthograph";
import join from "../things/membership/verbs/join.ts";

/** Aaron joined the club the moment the world started: 10 January 2027, nine in the morning UTC. */
export default Blueprint.startingWorld("member-since-january", {
  cast: { aaron: Blueprint.anyone },
  makes: (s) => [s.aaron.run(join, { name: "Aaron" })],
  gives: (s) => ({ membership: s.last.membership }),
});
