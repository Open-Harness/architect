// The good journal of each step that asks for events, written out: what a correct system's trace holds at that step (the tape runner reads it as prove reads a call's journal).
import { AssignmentQueued, AssignmentStarted, EvalExpired, EvalStarted, SuperagentPaused, SuperagentResumed, TriggerReceived } from "../kit/ops.ts";

export default {
  "#4": [[EvalStarted, {  }]],
  "#8": [[SuperagentPaused, { from: "live" }]],
  "#9": [[TriggerReceived, { thread: "issue/10" }]],
  "#11": [[AssignmentQueued, { why: "launch" }]],
  "#15": [[SuperagentResumed, { to: "live", length: 300000n }]],
  "#16": [[AssignmentStarted, { seat: 1n }]],
  "#19": [[EvalExpired, {  }]],
};
