import { Blueprint } from "orthograph";
import { Expense } from "./thing.ts";
import * as Events from "./events.ts";

// An expense is added and kept, as a row of its claim.
export const machine = Blueprint.machine(Expense, {
  states: ["active"],
  moves: { add: { from: [], to: "active", emits: Events.ExpenseAdded } },
  notFrom: { exit: 40 },
});
