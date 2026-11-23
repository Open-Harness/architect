// Hand-written over the scaffold (proof/): submit answers the two ledger lines it posts, so a journey can read them.
import { Blueprint } from "orthograph";
import { PaymentEntry } from "../thing.ts";
import { machine } from "../machine.ts";
import { accountsUser, accountsManager } from "../roles.ts";
import { GlEntry } from "../../gl-entry/thing.ts";

export default Blueprint.operation(PaymentEntry, {
  description: "Submit a payment entry: it posts a debit to the account paid to and a credit to the account paid from.",
  payload: { paymentEntry: PaymentEntry.fields.id },
  answer: { paymentEntry: PaymentEntry.fields.id, debit: GlEntry.fields.id, credit: GlEntry.fields.id },
  move: machine.moves.submit,
  allowed: [accountsUser, accountsManager],
  steps: { record: Blueprint.step.database({ writes: [PaymentEntry, GlEntry] }) },
});
