import { Blueprint } from "orthograph";
import { Payment } from "../thing.ts";
import { machine } from "../machine.ts";

export default Blueprint.operation(Payment, {
  description: "Start a payment. It is pending until the bank says the checkout completed.",
  payload: { amount: Payment.fields.amount },
  answer: { payment: Payment.fields.id },
  move: machine.moves.start,
  errors: [],
  allowed: [Blueprint.anyone],
  steps: { insert: Blueprint.step.database() },
  budget: { p95: "150 millis" },
});
