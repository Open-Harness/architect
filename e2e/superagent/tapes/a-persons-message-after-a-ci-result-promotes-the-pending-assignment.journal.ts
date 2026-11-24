// The good journal of each step that asks for events, written out: what a correct system's trace holds at that step (the tape runner reads it as prove reads a call's journal).
import { AssignmentEnded, AssignmentPromoted, AssignmentQueued, AssignmentStarted } from "../kit/ops.ts";

export default {
  "#4": [[AssignmentEnded, { seat: 1n }]],
  "#7": [[AssignmentStarted, { seat: 1n }]],
  "#9": [[AssignmentQueued, { why: "input" }]],
  "#11": [[AssignmentPromoted, {  }], [AssignmentStarted, { seat: 255n, why: "person" }]],
};
