// The good journal of each step that asks for events, written out: what a correct system's trace holds at that step (the tape runner reads it as prove reads a call's journal).
import { TriggerReceived } from "../kit/ops.ts";

export default {
  "#2": [[TriggerReceived, { superagent: "sag_1", thread: "issue/1" }]],
  "#3": [[TriggerReceived, { superagent: "sag_1", thread: "issue/2" }]],
  "#4": [[TriggerReceived, { superagent: "sag_1", thread: "issue/1" }]],
};
