import { Blueprint } from "orthograph";
import { agentOpen } from "../../kit/ops.ts";

/** Ann is listed and an executor agent is open for the first ticket; no ticket yet and no model scripted: a journey scripts, then accepts. */
export default Blueprint.startingWorld("an-executor-waits", {
  from: "a-listed-account",
  cast: { sys: Blueprint.system },
  makes: (s) => [s.sys.run(agentOpen, { kind: "executor", about: "ticket/one" })],
  gives: (s) => ({ main: s.world.main, superagent: s.world.superagent, account: s.world.account, executor: s.last.agent }),
});
