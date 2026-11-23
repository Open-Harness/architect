// The good journal of each step that asks for events, written out: what a correct system's trace holds at that step (the tape runner reads it as prove reads a call's journal).
import { AssignmentStarted } from "../kit/ops.ts";

export default {
  "#4": [[AssignmentStarted, { seat: 1n }]],
  "#11": [[AssignmentStarted, { agent: "agt_one", seat: 1n }]],
};
