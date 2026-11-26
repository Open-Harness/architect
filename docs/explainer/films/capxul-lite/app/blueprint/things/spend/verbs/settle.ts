import { Blueprint } from "orthograph";
import { Spend } from "../thing.ts";
import { machine } from "../machine.ts";
import { BudgetSpent } from "../../budget/events.ts";
import { Entry } from "../../entry/thing.ts";

// Nobody calls this. The follower hands on the event once the chain will keep it.
export default Blueprint.operation(Spend, {
  description: "Mark a spend paid and write it to the books.",
  payload: { spend: Spend.fields.id },
  move: machine.moves.settle,
  allowed: [Blueprint.system],
  on: [Blueprint.on(BudgetSpent, (e) => ({ spend: e.note }))],
  steps: { post: Blueprint.step.database({ writes: [Entry] }) },
});
