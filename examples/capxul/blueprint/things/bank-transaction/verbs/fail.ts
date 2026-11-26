import { Blueprint } from "orthograph";
import { BankTransaction } from "../thing.ts";
import { machine } from "../machine.ts";
import { TransferFailure } from "../../../values/bridge.ts";

// Bridge's report that a transfer out didn't reach its payee, with the state it ended in, which travels in the event.
export default Blueprint.operation(BankTransaction, {
  description: "Record that Bridge couldn't pay a transfer out, and how it ended.",
  payload: { transaction: BankTransaction.fields.id, state: TransferFailure },
  answer: { transaction: BankTransaction.fields.id },
  move: machine.moves.fail,
  allowed: [Blueprint.system],
  steps: { update: Blueprint.step.database() },
  idempotent: "request",
  budget: { p95: "150 millis" },
});
