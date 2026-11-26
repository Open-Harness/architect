import { Blueprint } from "orthograph";
import { Budget } from "./thing.ts";
import * as Events from "./events.ts";

export const machine = Blueprint.machine(Budget, {
  states: ["active", "exhausted", "revoked"],
  moves: {
    grant:  { from: [], to: "active", emits: Events.BudgetGranted },
    spend:  { from: ["active"], to: ["active", "exhausted"], emits: Events.BudgetSpent },
    renew:  { from: ["active", "exhausted"], to: "active", emits: Events.BudgetRenewed,
              by: Blueprint.time.every("1 month", { from: "startedAt" }), late: "10 minutes" },
    revoke: { from: ["active", "exhausted"], to: "revoked", emits: Events.BudgetRevoked },
  },
  notFrom: { exit: 40 },
});
