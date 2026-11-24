// The good journal of each step that asks for events, written out: what a correct system's trace holds at that step (the tape runner reads it as prove reads a call's journal).
import { AssignmentEnded, AssignmentInterrupted, InputStored } from "../kit/ops.ts";

export default {
  "#4": [[AssignmentInterrupted, { seat: 1n }]],
  "#5": [[AssignmentEnded, { seat: 1n }]],
  "#6": [[InputStored, { ticket: "tkt_one" }]],
};
