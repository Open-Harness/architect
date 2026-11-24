// The good journal of each step that asks for events, written out: what a correct system's trace holds at that step (the tape runner reads it as prove reads a call's journal).
import { AssignmentEnded, AssignmentQueued, AssignmentStarted, InputRouted, InputStored } from "../kit/ops.ts";

export default {
  "#3": [[AssignmentStarted, { agent: "agt_one", seat: 1n }]],
  "#5": [[InputStored, {  }]],
  "#6": [[InputRouted, { agent: "agt_one" }]],
  "#9": [[AssignmentEnded, { seat: 1n }]],
  "#11": [[InputStored, {  }], [AssignmentQueued, { why: "person" }], [AssignmentStarted, { agent: "agt_one", seat: 1n }]],
};
