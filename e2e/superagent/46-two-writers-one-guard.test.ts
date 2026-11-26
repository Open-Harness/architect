// Slice 8, "Two writers, one guard" (GOAL17-executor-slots): a late idle cannot end the next Assignment; a stopped ticket's opening tell is refused; a reap
// before the opening tell never frees a seat the executor then uses; a refusal cycle is bounded; two fills start an Assignment once; a stop on a full pool
// starts nothing until `AgentClosed`; `reap`'s grace; a close is resent only for an old closing row. Red until slice 9.
import { journeysPass } from "./agents-support.ts";

journeysPass("two writers, one guard", [
  "reap-restart-and-redeliver-leave-a-late-idle-unable-to-end-the-next", "a-stopped-tickets-opening-tell-is-refused", "a-reap-before-the-opening-tell-arrives",
  "a-refusal-cycle-writes-at-most-six-rows-in-30-seconds", "two-fills-at-once-start-an-assignment-once", "a-stop-on-a-full-pool-starts-nothing-until-agent-closed",
  "reap-closes-an-idle-assignment-only-after-a-whole-sweep", "a-close-is-resent-only-for-a-closing-row-older-than-a-sweep",
]);
