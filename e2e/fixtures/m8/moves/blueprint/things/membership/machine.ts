import { Blueprint } from "orthograph";
import { Membership } from "./thing.ts";
import * as Events from "./events.ts";

export const machine = Blueprint.machine(Membership, {
  states: ["active", "overdue", "lapsed"],
  moves: {
    join: { from: [], to: "active", emits: Events.MembershipStarted },
    // Each month on the day it started; a day the month lacks falls on its last day (K23 section 4).
    renew: { from: ["active"], to: "active", emits: Events.MembershipRenewed, by: Blueprint.time.every("1 month", { from: "startedAt" }), late: "10 minutes" },
    miss: { from: ["active"], to: "overdue", emits: Events.PaymentMissed },
    pay: { from: ["overdue"], to: "active", emits: Events.PaymentMade },
    // Fourteen days after the payment was missed, unless it was made first: leaving `overdue` clears the timer.
    lapse: { from: ["overdue"], to: "lapsed", emits: Events.MembershipLapsed, by: Blueprint.time.after("overdueAt", "14 days") },
  },
  notFrom: { exit: 80 },
});
