import { Blueprint } from "orthograph";
import { ExpenseClaimType } from "./thing.ts";
import * as Events from "./events.ts";

// HRMS's Expense Claim Type has no lifecycle.
export const machine = Blueprint.machine(ExpenseClaimType, {
  states: ["active"],
  moves: {
    create: { from: [], to: "active", emits: Events.ExpenseClaimTypeCreated },
  },
  notFrom: { exit: 40 },
});
