import { Blueprint } from "orthograph";
import { Spend } from "./thing.ts";
import * as Events from "./events.ts";

export const machine = Blueprint.machine(Spend, {
  states: ["paid", "unexplained"],
  moves: {
    // The chain paid. Do we hold the reason its seal stands for?
    record:  { from: [], to: ["paid", "unexplained"], emits: Events.SpendRecorded },
    explain: { from: ["unexplained"], to: "paid", emits: Events.SpendExplained },
  },
  notFrom: { exit: 40 },
});
