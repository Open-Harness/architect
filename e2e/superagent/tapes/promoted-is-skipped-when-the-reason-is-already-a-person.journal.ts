// The good journal of each step that asks for events, written out: what a correct system's trace holds at that step (the tape runner reads it as prove reads a call's journal).
import { AssignmentPromoted, AssignmentStarted, InputStored } from "../kit/ops.ts";

export default {
  "#4": [[AssignmentStarted, { seat: 1n }]],
  "#7": [[InputStored, {  }]],
  "#8": [[AssignmentPromoted, {  }], [AssignmentStarted, { seat: 255n, why: "person" }]],
  "#13": [[InputStored, {  }]],
  "#14": [[AssignmentPromoted, {  }]],
  "#15": [[InputStored, {  }]],
  "#18": [[InputStored, {  }]],
};
