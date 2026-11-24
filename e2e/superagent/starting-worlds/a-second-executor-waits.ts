import { Blueprint } from "orthograph";
import { agentOpen } from "../../kit/ops.ts";

export default Blueprint.startingWorld("a-second-executor-waits", {
  from: "a-paused-ticket",
  cast: { sys: Blueprint.system },
  makes: (s) => [s.sys.run(agentOpen, { kind: "executor", about: "ticket/two" })],
  gives: (s) => ({ main: s.world.main, superagent: s.world.superagent, account: s.world.account, executor: s.world.executor, ticket: s.world.ticket, executorTwo: s.last.agent }),
});
