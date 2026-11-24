// The good journal of each step that asks for events, written out: what a correct system's trace holds at that step (the tape runner reads it as prove reads a call's journal).
import { AccountListed, AccountSeen, ProposalRecorded } from "../kit/ops.ts";

export default {
  "#1": [[ProposalRecorded, { superagent: "sag_1" }]],
  "#3": [[ProposalRecorded, { superagent: "sag_1" }]],
  "#4": [[ProposalRecorded, { superagent: "sag_1" }]],
  "#5": [[ProposalRecorded, { superagent: "sag_1" }]],
  "#6": [[ProposalRecorded, { superagent: "sag_1" }]],
  "#10": [[AccountListed, { account: "acc_ann" }]],
  // The roster's one person (GitHub 3), seen and then listed by ann's own sync; its bot (7) is not listed (GOAL17-person-sync).
  "#11": [[AccountSeen, { account: "acc_roster_3", superagent: "sag_1" }], [AccountListed, { account: "acc_roster_3" }]],
};
