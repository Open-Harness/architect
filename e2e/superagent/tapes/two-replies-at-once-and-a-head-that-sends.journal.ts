// The good journal of each step that asks for events, written out: what a correct system's trace holds at that step (the tape runner reads it as prove reads a call's journal).
import { AssignmentStarted, ReplyQueued, SuperagentResumed } from "../kit/ops.ts";

export default {
  "#3": [[SuperagentResumed, {  }]],
  "#4": [[AssignmentStarted, { agent: "agt_one" }]],
  "#9": [[ReplyQueued, {  }]],
};
