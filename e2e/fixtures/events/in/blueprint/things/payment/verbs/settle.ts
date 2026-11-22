import { Blueprint } from "orthograph";
import { Payment } from "../thing.ts";
import { machine } from "../machine.ts";
import bank from "../../../adapters/bank.ts";

// Only the bank may call it, through its door; nobody else, whoever else is signed in (M5-reach-out, Q3 and Q4).
export default Blueprint.operation(Payment, {
  description: "Settle a payment: the bank said its checkout completed.",
  payload: { payment: Payment.fields.id, intent: Payment.fields.intent },
  answer: { payment: Payment.fields.id },
  move: machine.moves.settle,
  errors: [],
  allowed: [Blueprint.service(bank)],
  on: [Blueprint.on(bank.events.checkoutCompleted, (e) => ({ payment: e.reference, intent: e.intent }))],
  steps: { load: Blueprint.step.database(), record: Blueprint.step.database() },
  budget: { p95: "150 millis" },
});
