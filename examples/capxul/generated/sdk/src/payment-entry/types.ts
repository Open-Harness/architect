// Generated from the blueprint. Do not edit.
import type * as Source from "../../../../blueprint/things/payment-entry/thing.ts";
import type * as Events from "../../../../blueprint/things/payment-entry/events.ts";

type Declared = Extract<(typeof Source)[keyof typeof Source], { readonly kind: "thing" }>["fields"];
/** What a field or value holds, as the blueprint's own schema decodes it. */
type Of<F> = F extends { readonly value: { readonly schema: { readonly Type: infer T } } } ? T : F extends { readonly schema: { readonly Type: infer T } } ? T : never;

/** The states a payment-entry moves between, as its machine declares them. */
export type PaymentEntryState = "draft" | "submitted" | "cancelled";

/** Money a company receives from a customer or supplier, or pays to one, posted to the ledger when submitted. A field not every caller is shown (secret, or private to roles) may be missing from what a call returns. */
export type PaymentEntry = {
  readonly "id": Of<Declared["id"]>;
  readonly "company": Of<Declared["company"]>;
  readonly "paymentType": Of<Declared["paymentType"]>;
  readonly "postingDate": Of<Declared["postingDate"]>;
  readonly "partyType": Of<Declared["partyType"]>;
  readonly "party": Of<Declared["party"]>;
  readonly "paidFrom": Of<Declared["paidFrom"]>;
  readonly "paidTo": Of<Declared["paidTo"]>;
  readonly "paidAmount": Of<Declared["paidAmount"]>;
  readonly "costCenter": Of<Declared["costCenter"]>;
  readonly "state": PaymentEntryState;
};

/** The event PaymentEntryCancelled: what it carries when a payment-entry moves. */
export type PaymentEntryCancelled = {
  readonly "paymentEntry": Of<(typeof Events)["PaymentEntryCancelled"]["fields"]["paymentEntry"]>;
  readonly "reversed": Of<(typeof Events)["PaymentEntryCancelled"]["fields"]["reversed"]>;
};

/** The event PaymentEntryDrafted: what it carries when a payment-entry moves. */
export type PaymentEntryDrafted = {
  readonly "paymentEntry": Of<(typeof Events)["PaymentEntryDrafted"]["fields"]["paymentEntry"]>;
  readonly "company": Of<(typeof Events)["PaymentEntryDrafted"]["fields"]["company"]>;
  readonly "paymentType": Of<(typeof Events)["PaymentEntryDrafted"]["fields"]["paymentType"]>;
  readonly "partyType": Of<(typeof Events)["PaymentEntryDrafted"]["fields"]["partyType"]>;
  readonly "party": Of<(typeof Events)["PaymentEntryDrafted"]["fields"]["party"]>;
  readonly "paidAmount": Of<(typeof Events)["PaymentEntryDrafted"]["fields"]["paidAmount"]>;
};

/** The event PaymentEntrySubmitted: what it carries when a payment-entry moves. */
export type PaymentEntrySubmitted = {
  readonly "paymentEntry": Of<(typeof Events)["PaymentEntrySubmitted"]["fields"]["paymentEntry"]>;
  readonly "posted": Of<(typeof Events)["PaymentEntrySubmitted"]["fields"]["posted"]>;
};
