// The good journal of each step that asks for events, written out: what a correct system's trace holds at that step (the tape runner reads it as prove reads a call's journal).
import { AccountListed, ProposalRecorded } from "../kit/ops.ts";

export default {
  "#1": [[ProposalRecorded, { superagent: "sag_1" }]],
  "#3": [[ProposalRecorded, { superagent: "sag_1" }]],
  "#4": [[ProposalRecorded, { superagent: "sag_1" }]],
  "#5": [[ProposalRecorded, { superagent: "sag_1" }]],
  "#6": [[ProposalRecorded, { superagent: "sag_1" }]],
  "#10": [[AccountListed, { account: "acc_ann" }]],
  // The roster's person, seen by the door at step 11, listed by ann.
  "#12": [[AccountListed, { account: "acc_roster_3" }]],
};
