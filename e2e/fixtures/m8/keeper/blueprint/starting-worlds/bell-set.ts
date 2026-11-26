// Journey-author file: a starting world is made by declared operations, never by hand (D2 #4).
import { Blueprint } from "orthograph";
import set from "../things/bell/verbs/set.ts";

/** Aaron set the bell the moment the world started, at nine: it chimes at ten. */
export default Blueprint.startingWorld("bell-set", {
  cast: { aaron: Blueprint.anyone },
  makes: (s) => [s.aaron.run(set, { name: "Hall" })],
  gives: (s) => ({ bell: s.last.bell }),
});
