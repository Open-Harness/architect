import { Blueprint } from "orthograph";
import { BankTransaction } from "../thing.ts";
import { machine } from "../machine.ts";

// Bridge's report that a transfer out reached its payee (`transfer`, state `payment_processed`). Until #995 brings
// Bridge's webhook door to an operation, the system makes it (journeys/README.md, "Who speaks for Bridge").
export default Blueprint.operation(BankTransaction, {
  description: "Record that Bridge paid a transfer out.",
  payload: { transaction: BankTransaction.fields.id },
  answer: { transaction: BankTransaction.fields.id },
  move: machine.moves.settle,
  allowed: [Blueprint.system],
  steps: { update: Blueprint.step.database() },
  idempotent: "request",
  budget: { p95: "150 millis" },
});
