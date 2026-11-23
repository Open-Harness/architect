// Slice 8's starting worlds: each is made by declared operations (D2 #4), one step on the one before. A world's `s.last` is the
// answer of its last call, so each world gives what the next needs. They live in the app's `blueprint/starting-worlds/`.
import { Blueprint } from "orthograph";
import { agentOpen } from "../../kit/ops.ts";

/** The superagent's main agent exists: the id `superagent.create` is given as `main`. */
export default Blueprint.startingWorld("a-main-agent-exists", {
  cast: { sys: Blueprint.system },
  makes: (s) => [s.sys.run(agentOpen, { kind: "main", about: "superagent" })],
  gives: (s) => ({ main: s.last.agent }),
});
