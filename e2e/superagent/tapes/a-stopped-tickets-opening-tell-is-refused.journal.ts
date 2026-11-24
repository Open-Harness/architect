// The good journal of each step that asks for events, written out: what a correct system's trace holds at that step (the tape runner reads it as prove reads a call's journal).
import { AgentClosed, AssignmentEnded, AssignmentInterrupted, AssignmentStarted, InputStored } from "../kit/ops.ts";

export default {
  "#3": [[AssignmentStarted, { agent: "agt_one", seat: 1n }]],
  "#4": [[AssignmentInterrupted, { seat: 1n }]],
  "#5": [[AgentClosed, { agent: "agt_one" }], [AssignmentEnded, { seat: 1n }]],
  "#7": [[InputStored, { ticket: "tkt_one" }]],
};
