// The good journal of each step that asks for events, written out: what a correct system's trace holds at that step (the tape runner reads it as prove reads a call's journal).
import { AssignmentStarted, InputStored } from "../kit/ops.ts";

export default {
  "#3": [[AssignmentStarted, { agent: "agt_one", ticket: "tkt_one", seat: 1n }]],
  "#6": [[InputStored, { superagent: "sag_1", ticket: "tkt_one" }]],
  "#7": [[AssignmentStarted, { agent: "agt_one", ticket: "tkt_one", seat: 1n }]],
};
