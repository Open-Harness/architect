import { Blueprint } from "orthograph";
import { Spend } from "../thing.ts";
import { machine } from "../machine.ts";
import { holder } from "../../budget/roles.ts";
import budgetSpend from "../../budget/verbs/spend.ts";

export default Blueprint.operation(Spend, {
  description: "Say what you are about to pay for.",
  payload: { budget: Spend.fields.budget, to: Spend.fields.to, amount: Spend.fields.amount, reason: Spend.fields.reason },
  answer: { spend: Spend.fields.id },
  move: machine.moves.draft,
  allowed: [holder.of("budget")],
  steps: { record: Blueprint.step.database() },
  idempotent: "request",
  budget: { p95: "150 millis" },
  // What the same caller does next, and what is carried across.
  next: Blueprint.next(budgetSpend, (s) => // new
    ({ budget: s.budget, amount: s.amount, to: s.to, note: s.id })), // new
});
