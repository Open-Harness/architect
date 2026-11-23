import { Blueprint } from "orthograph";
import { Superagent } from "@orthograph/superagent/blueprint/things/superagent/thing.ts";

// Part of the 30-second seat sweep (GOAL17-executor-slots, section 3): a running Assignment whose executor is idle is closed, never ended.
export default Blueprint.operation(Superagent, {
  description: "Close the running Assignments whose executor is idle, so their seats come back once the Agent has said it closed.",
  payload: { superagent: Superagent.fields.id },
  answer: { reaped: Blueprint.uint(8) },
  allowed: [Blueprint.system],
});
