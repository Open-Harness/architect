// Journey-author file (M4.02). An operator agent that is offered an owner-only operation, `allowance.revoke`, so a
// journey can show an agent is refused it exactly as the person who started it is (frame journey 7).
import { Blueprint } from "orthograph";
import mine from "../things/allowance/verbs/mine.ts";
import revoke from "../things/allowance/verbs/revoke.ts";

export default Blueprint.agent({
  instructions: "./desk.md",
  operations: [mine, revoke],
  limits: { maxTurns: 6, maxUsd: 1, wall: "5 minutes" },
});
