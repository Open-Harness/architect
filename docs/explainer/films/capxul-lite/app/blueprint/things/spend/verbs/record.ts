import { Blueprint } from "orthograph";
import { Spend } from "../thing.ts";
import { machine } from "../machine.ts";
import { BudgetSpent } from "../../budget/events.ts";
import { Entry } from "../../entry/thing.ts";
import { Reason } from "../../../values/money.ts";

// Nobody calls this. The indexer hands on BudgetSpent once the chain will keep it.
export default Blueprint.operation(Spend, {
  description: "Write a payment into the books, with its reason if we hold it.",
  payload: { budget: Spend.fields.budget, to: Spend.fields.to, amount: Spend.fields.amount,
             reason: Blueprint.sealed(Reason) }, // new
  move: machine.moves.record,
  allowed: [Blueprint.system],
  on: [Blueprint.on(BudgetSpent, (e) => ({ budget: e.budget, to: e.to, amount: e.amount, reason: e.reason }))],
  steps: { post: Blueprint.step.database({ writes: [Entry] }) },
});
