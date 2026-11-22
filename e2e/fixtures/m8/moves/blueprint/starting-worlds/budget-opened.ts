// Journey-author file: a starting world is made by declared operations, never by hand (D2 #4).
import { Blueprint } from "orthograph";
import open from "../things/budget/verbs/open.ts";

/** The London office's budget, opened when the world started: 10 January 2027, nine UTC. */
export default Blueprint.startingWorld("budget-opened", {
  cast: { office: Blueprint.anyone },
  makes: (s) => [s.office.run(open, { title: "London office" })],
  gives: (s) => ({ budget: s.last.budget }),
});
