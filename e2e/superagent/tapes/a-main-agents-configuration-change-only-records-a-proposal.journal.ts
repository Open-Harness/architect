// The good journal of each step that asks for events, written out: what a correct system's trace holds at that step (the tape runner reads it as prove reads a call's journal).
import { AccountListed, ProposalRecorded } from "../kit/ops.ts";

export default {
  "#1": [[ProposalRecorded, { superagent: "sag_1" }]],
  "#3": [[ProposalRecorded, { superagent: "sag_1" }]],
  "#4": [[ProposalRecorded, { superagent: "sag_1" }]],
  "#5": [[ProposalRecorded, { superagent: "sag_1" }]],
  "#6": [[ProposalRecorded, { superagent: "sag_1" }]],
  "#10": [[AccountListed, { account: "acc_ann" }]],
  // The roster's two accounts (GitHub 3 and 7), each listed by ann's own sync.
  "#11": [[AccountListed, { account: "acc_roster_3" }], [AccountListed, { account: "acc_roster_7" }]],
};
