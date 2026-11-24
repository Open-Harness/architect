// The good journal of each step that asks for events, written out: what a correct system's trace holds at that step (the tape runner reads it as prove reads a call's journal).
import { AssignmentPromoted, AssignmentQueued, AssignmentStarted, InputStored } from "../kit/ops.ts";

export default {
  "#3": [[AssignmentQueued, { why: "launch" }]],
  "#4": [[AssignmentStarted, { seat: 1n, why: "launch" }]],
  "#6": [[AssignmentQueued, { why: "launch" }]],
  "#8": [[AssignmentQueued, { why: "launch" }]],
  "#10": [[AssignmentQueued, { why: "launch" }]],
  "#13": [[InputStored, {  }]],
  "#14": [[AssignmentPromoted, {  }], [AssignmentStarted, { seat: 255n, why: "person" }]],
  "#15": [[InputStored, {  }]],
  "#16": [[AssignmentPromoted, {  }]],
  "#22": [[AssignmentStarted, { seat: 1n, why: "person" }]],
};
