import { Blueprint } from "orthograph";
import { PaymentEntry } from "./thing.ts";
import { LineCount } from "../../values/ledger.ts";

export const PaymentEntryDrafted = Blueprint.event({
  paymentEntry: PaymentEntry.fields.id,
  company: PaymentEntry.fields.company,
  paymentType: PaymentEntry.fields.paymentType,
  partyType: PaymentEntry.fields.partyType,
  party: PaymentEntry.fields.party,
  paidAmount: PaymentEntry.fields.paidAmount,
});
/** `posted` is how many ledger lines the submit wrote: two, the party's and the bank's. */
export const PaymentEntrySubmitted = Blueprint.event({ paymentEntry: PaymentEntry.fields.id, posted: LineCount });
/** `reversed` is how many reversing ledger lines the cancel wrote: one per line posted. */
export const PaymentEntryCancelled = Blueprint.event({ paymentEntry: PaymentEntry.fields.id, reversed: LineCount });
