// The good journal of each step that asks for events, written out: what a correct system's trace holds at that step (the tape runner reads it as prove reads a call's journal).
import { AssignmentStarted, InputDelivered, InputRouted, InputStored } from "../kit/ops.ts";

export default {
  "#3": [[AssignmentStarted, { agent: "agt_one", seat: 1n }]],
  "#5": [[InputStored, { superagent: "sag_1" }]],
  "#6": [[InputRouted, { agent: "agt_one" }]],
  "#8": [[InputDelivered, {  }]],
};
