import { Blueprint } from "orthograph";
import { PaymentEntry } from "../thing.ts";
import { machine } from "../machine.ts";
import { PartyDisabled, PaymentPostingDateOutsideFiscalYear } from "../errors.ts";
import { owner } from "../../company/roles.ts";
import { GLEntry } from "../../gl-entry/thing.ts";
import { LineCount } from "../../../values/ledger.ts";

// ERPNext's `on_submit`, through `build_gl_map`: the party's line first (`add_party_gl_entries`, the whole amount
// unallocated), on the party's account with the party type and party, credited on Receive and debited on Pay; then
// the bank's line (`add_bank_gl_entries`), debiting Paid To on Receive and crediting Paid From on Pay, with no party.
// Both carry the payment's company, cost center and posting day, voucher type Payment Entry and the payment's id. The
// posting day must fall in one of the company's fiscal years, and the party must not be disabled.
export default Blueprint.operation(PaymentEntry, {
  description: "Submit a payment, posting the party's ledger line and the bank's.",
  payload: { paymentEntry: PaymentEntry.fields.id },
  answer: { paymentEntry: PaymentEntry.fields.id, posted: LineCount },
  move: machine.moves.submit,
  errors: [PaymentPostingDateOutsideFiscalYear, PartyDisabled],
  allowed: [owner.of("paymentEntry.company")],
  steps: { load: Blueprint.step.database({ writes: [] }), post: Blueprint.step.database({ writes: [PaymentEntry, GLEntry] }) },
  idempotent: "request",
  budget: { p95: "300 millis" },
});
