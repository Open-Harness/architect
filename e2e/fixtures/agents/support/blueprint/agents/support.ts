// Journey-author file (M4.02). acme's support agent (Gate M4 item 1): it works the allowance of whoever started it.
// `invitation.accept` is listed on purpose: it is declared `.notVia(Via.agent)`, so it is never offered as a tool
// (K10 section 1), and the journey that runs this agent says so. `allowance.mine` is the fixture's read of the
// starter's allowances, so the agent can find the id a spend needs.
import { Blueprint } from "orthograph";
import mine from "../things/allowance/verbs/mine.ts";
import get from "../things/allowance/verbs/get.ts";
import spend from "../things/allowance/verbs/spend.ts";
import accept from "../things/invitation/verbs/accept.ts";

export default Blueprint.agent({
  instructions: "./support.md",
  operations: [mine, get, spend, accept],
  limits: { maxTurns: 6, maxUsd: 1, wall: "5 minutes" },
});
