// Journey-author file: a starting world is made by declared operations, never by hand (D2 #4).
import { Blueprint, Via } from "orthograph";
import open from "../../../blueprint/things/personal-safe/verbs/open.ts";

/** From ada has opened her safe: Bo's agent has opened Bo's own Safe through MCP. Neither is claimed. */
export default Blueprint.startingWorld("ada and bo have opened their safes", {
  from: "ada has opened her safe",
  cast: { bo: Blueprint.signedIn },
  makes: (s) => [s.bo.via(Via.agent).run(open, {})],
  gives: (s) => ({ adaSafe: s.world.adaSafe, boSafe: s.last.safe }),
});
