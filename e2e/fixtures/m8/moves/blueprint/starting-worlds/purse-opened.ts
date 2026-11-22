// Journey-author file: a starting world is made by declared operations, never by hand (D2 #4).
import { Blueprint } from "orthograph";
import open from "../things/purse/verbs/open.ts";

/** A purse of 100 a month, opened when the world started: 10 January 2027, nine UTC. */
export default Blueprint.startingWorld("purse-opened", {
  cast: { aaron: Blueprint.anyone },
  makes: (s) => [s.aaron.run(open, { limit: 100n })],
  gives: (s) => ({ purse: s.last.purse }),
});
