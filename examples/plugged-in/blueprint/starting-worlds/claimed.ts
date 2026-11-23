// Journey-author file: a starting world is made by declared operations, never by hand. Handle names are unique in a
// run (one world serves every journey), so each starting world claims a name of its own and one journey starts from it.
import { Blueprint } from "orthograph";
import claim from "../things/handle/verbs/claim.ts";

/** aaron has claimed `claimedname`, with the request key `first-claim`. It has no links. */
export default Blueprint.startingWorld("claimed", {
  cast: { aaron: Blueprint.signedIn },
  makes: (s) => [s.aaron.run(claim, { name: "claimedname" }, { request: "first-claim" })],
  gives: (s) => ({ handle: s.last.handle }),
});
