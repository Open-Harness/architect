import { Blueprint } from "orthograph";
import { superagentCreate } from "../../kit/ops.ts";
import { CONNECTIONS, PLAYBOOK, POOL } from "../../kit/consts.ts";

/** One superagent with one seat in its pool and the reserve (GOAL17-executor-slots), both connections, observing. */
export default Blueprint.startingWorld("an-observing-superagent", {
  from: "a-main-agent-exists",
  cast: { ann: Blueprint.signedIn },
  makes: (s) => [s.ann.run(superagentCreate, { name: "coder", purpose: "Takes asks on issues and in Slack.", connections: CONNECTIONS, playbook: PLAYBOOK, slots: POOL, main: s.world.main })],
  gives: (s) => ({ main: s.world.main, superagent: s.last.superagent }),
});
