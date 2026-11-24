// The good journal of each step that asks for events, written out: what a correct system's trace holds at that step (the tape runner reads it as prove reads a call's journal).
import { AssignmentStarted, SuperagentResumed } from "../kit/ops.ts";

export default {
  "#8": [[SuperagentResumed, { to: "live" }]],
  "#9": [[AssignmentStarted, { agent: "agt_one", seat: 1n }]],
};
