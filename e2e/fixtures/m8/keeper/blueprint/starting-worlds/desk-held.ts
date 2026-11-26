// Journey-author file: a starting world is made by declared operations, never by hand (D2 #4).
import { Blueprint } from "orthograph";
import hold from "../things/desk/verbs/hold.ts";

/** Aaron held the window desk the moment the world started: 10 January 2027, nine in the morning UTC. */
export default Blueprint.startingWorld("desk-held", {
  cast: { aaron: Blueprint.anyone },
  makes: (s) => [s.aaron.run(hold, { name: "Window" })],
  gives: (s) => ({ desk: s.last.desk }),
});
