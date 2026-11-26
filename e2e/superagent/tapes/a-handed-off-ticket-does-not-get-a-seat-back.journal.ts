// The good journal of each step that asks for events, written out: what a correct system's trace holds at that step (the tape runner reads it as prove reads a call's journal).
import { AgentClosed, AssignmentEnded, InputRouted } from "../kit/ops.ts";

export default {
  "#4": [[AssignmentEnded, { seat: 1n }]],
  "#6": [[InputRouted, { agent: "agt_one" }]],
  "#10": [[AgentClosed, { agent: "agt_one" }]],
};
