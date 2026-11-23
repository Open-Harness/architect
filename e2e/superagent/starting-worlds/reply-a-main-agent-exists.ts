// Starting worlds of check 66's journeys (slice 10). Each is made by declared operations (D2 #4), one step on the one before, as slice 8's
// are; these are the same chain under names of their own (`reply-…`), so check 66 needs nothing of slice 8's branch. They are overlaid on
// the app's `blueprint/starting-worlds/`.
import { Blueprint } from "orthograph";
import agentOpen from "@orthograph/agents/blueprint/things/agent/verbs/open.ts";

/** The superagent's main agent exists: the id `superagent.create` is given as `main`. */
export default Blueprint.startingWorld("reply-a-main-agent-exists", {
  cast: { sys: Blueprint.system },
  makes: (s) => [s.sys.run(agentOpen, { kind: "main", about: "superagent" })],
  gives: (s) => ({ main: s.last.agent }),
});
