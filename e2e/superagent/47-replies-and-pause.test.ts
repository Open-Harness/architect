// Slice 8, replies and the pause (GOAL17-derived-reads, GOAL17-pause): two replies at once and a head that sends at that moment leave one head and no lost
// reply; one chatty ticket's writes stay within budget; pause holds evals, launches, deliveries and replies while triggers keep arriving, and moves an eval's
// deadline later by its length; a kill during a pause loses nothing. Red until slice 9 builds pause and the outbox's holds.
import { journeysPass } from "./agents-support.ts";

journeysPass("replies and the pause", [
  "two-replies-at-once-and-a-head-that-sends", "one-chatty-tickets-writes-stay-within-budget", "pause-holds-processing-while-triggers-keep-arriving", "a-kill-during-a-pause-loses-nothing",
]);
