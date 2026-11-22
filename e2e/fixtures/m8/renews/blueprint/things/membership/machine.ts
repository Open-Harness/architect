import { Blueprint } from "orthograph";
import { Membership } from "./thing.ts";
import * as Events from "./events.ts";

export const machine = Blueprint.machine(Membership, {
  states: ["active"],
  moves: {
    join: { from: [], to: "active", emits: Events.MembershipStarted },
    // A move made by time (K23 section 3): the keeper renews it each month, on the day it started.
    renew: { from: ["active"], to: "active", emits: Events.MembershipRenewed, by: Blueprint.time.every("1 month", { from: "startedAt" }) },
  },
  notFrom: { exit: 80 },
});
