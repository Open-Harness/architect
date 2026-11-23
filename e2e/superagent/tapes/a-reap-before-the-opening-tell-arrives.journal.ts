// The good journal of each step that asks for events, written out: what a correct system's trace holds at that step (the tape runner reads it as prove reads a call's journal).
import { AgentClosed, AssignmentEnded, AssignmentInterrupted, AssignmentQueued, AssignmentStarted, InputStored } from "../kit/ops.ts";

export default {
  "#4": [[AssignmentStarted, { agent: "agt_one", seat: 1n }]],
  "#5": [[AssignmentInterrupted, { seat: 1n }], [AgentClosed, { agent: "agt_one" }], [AssignmentEnded, { seat: 1n }]],
  "#8": [[InputStored, {  }], [AssignmentQueued, { why: "launch" }], [AssignmentStarted, { agent: "agt_one", seat: 1n }]],
};
