import { Blueprint } from "orthograph";
import { BankTransaction } from "./thing.ts";
import * as Events from "./events.ts";

// ERPNext's Bank Transaction is Pending, Settled, Unreconciled, Reconciled or Cancelled. Capxul keeps the three Bridge
// decides: a deposit Bridge reports has already landed (`settled`); a transfer out is `pending` until Bridge says it
// reached the payee (`payment_processed`) or didn't (`failed`). Reconciling comes with the books (slice 7).
export const machine = Blueprint.machine(BankTransaction, {
  states: ["pending", "settled", "failed"],
  moves: {
    land: { from: [], to: "settled", emits: Events.DepositLanded },
    send: { from: [], to: "pending", emits: Events.TransferSent },
    settle: { from: ["pending"], to: "settled", emits: Events.TransferSettled },
    fail: { from: ["pending"], to: "failed", emits: Events.TransferFailed },
  },
  notFrom: { exit: 40 },
});
