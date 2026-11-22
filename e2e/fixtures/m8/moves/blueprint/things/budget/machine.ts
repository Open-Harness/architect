import { Blueprint } from "orthograph";
import { Budget } from "./thing.ts";
import * as Events from "./events.ts";

export const machine = Blueprint.machine(Budget, {
  states: ["active"],
  moves: {
    open: { from: [], to: "active", emits: Events.BudgetOpened },
    // Calendar anchors name their zone (K23 section 4): the start of the 25th, and of the month's last day, in London.
    reset: { from: ["active"], to: "active", emits: Events.BudgetReset, by: Blueprint.time.every("1 month", { on: { day: 25 }, zone: "Europe/London" }) },
    report: { from: ["active"], to: "active", emits: Events.BudgetReported, by: Blueprint.time.every("1 month", { on: { day: "last" }, zone: "Europe/London" }) },
  },
  notFrom: { exit: 81 },
});
