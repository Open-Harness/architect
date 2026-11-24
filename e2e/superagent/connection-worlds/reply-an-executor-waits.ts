import { Blueprint } from "orthograph";
import agentOpen from "@orthograph/agents/blueprint/things/agent/verbs/open.ts";

/** An executor agent is open for the first ticket; no ticket yet and no model scripted. */
export default Blueprint.startingWorld("reply-an-executor-waits", {
  from: "reply-a-listed-account",
  cast: { sys: Blueprint.system },
  makes: (s) => [s.sys.run(agentOpen, { kind: "executor", about: "ticket/one" })],
  gives: (s) => ({ main: s.world.main, superagent: s.world.superagent, account: s.world.account, executor: s.last.agent }),
});
