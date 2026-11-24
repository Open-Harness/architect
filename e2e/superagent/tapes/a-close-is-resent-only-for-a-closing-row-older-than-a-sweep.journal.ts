// The good journal of each step that asks for events, written out: what a correct system's trace holds at that step (the tape runner reads it as prove reads a call's journal).
import { AgentClosed, AssignmentEnded, AssignmentInterrupted } from "../kit/ops.ts";

export default {
  "#6": [[AssignmentInterrupted, { seat: 1n }]],
  "#8": [[AgentClosed, { agent: "agt_one" }], [AssignmentEnded, { seat: 1n }]],
};
