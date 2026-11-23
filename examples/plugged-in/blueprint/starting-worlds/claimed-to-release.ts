// Journey-author file. See claimed.ts for why each starting world has a name of its own.
import { Blueprint } from "orthograph";
import claim from "../things/handle/verbs/claim.ts";

/** aaron has claimed `releasepage`. It has no links. */
export default Blueprint.startingWorld("claimed-to-release", {
  cast: { aaron: Blueprint.signedIn },
  makes: (s) => [s.aaron.run(claim, { name: "releasepage" })],
  gives: (s) => ({ handle: s.last.handle }),
});
