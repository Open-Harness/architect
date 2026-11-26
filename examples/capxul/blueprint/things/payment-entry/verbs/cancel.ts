import { Blueprint } from "orthograph";
import { PaymentEntry } from "../thing.ts";
import { machine } from "../machine.ts";
import { owner } from "../../company/roles.ts";
import { GLEntry } from "../../gl-entry/thing.ts";
import { LineCount } from "../../../values/ledger.ts";

// ERPNext's `on_cancel`, through `make_gl_entries(cancel=1)` and `make_reverse_gl_entries` with the immutable ledger
// off (its default): both ledger lines the submit posted are marked cancelled, and a reversal of each is posted, debit
// and credit swapped, on the same account, party, cost center and posting day, marked cancelled too. Nothing is
// deleted, and the party's balance drops both (`decisions/CX-parties-payments.md`).
export default Blueprint.operation(PaymentEntry, {
  description: "Cancel a submitted payment, posting a reversing ledger line for each it posted.",
  payload: { paymentEntry: PaymentEntry.fields.id },
  answer: { paymentEntry: PaymentEntry.fields.id, reversed: LineCount },
  move: machine.moves.cancel,
  allowed: [owner.of("paymentEntry.company")],
  steps: { load: Blueprint.step.database({ writes: [] }), reverse: Blueprint.step.database({ writes: [PaymentEntry, GLEntry] }) },
  idempotent: "request",
  budget: { p95: "300 millis" },
});
