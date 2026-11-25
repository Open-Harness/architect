// Generated from the blueprint. Do not edit.
import type * as Source from "../../../../blueprint/things/gl-entry/thing.ts";

type Declared = Extract<(typeof Source)[keyof typeof Source], { readonly kind: "thing" }>["fields"];
/** What a field or value holds, as the blueprint's own schema decodes it. */
type Of<F> = F extends { readonly value: { readonly schema: { readonly Type: infer T } } } ? T : F extends { readonly schema: { readonly Type: infer T } } ? T : never;

/** One line of a company's general ledger, posted by a voucher. A field not every caller is shown (secret, or private to roles) may be missing from what a call returns. */
export type GlEntry = {
  readonly "id": Of<Declared["id"]>;
  readonly "company": Of<Declared["company"]>;
  readonly "account": Of<Declared["account"]>;
  readonly "costCenter": Of<Declared["costCenter"]>;
  readonly "postingDate": Of<Declared["postingDate"]>;
  readonly "debit": Of<Declared["debit"]>;
  readonly "credit": Of<Declared["credit"]>;
  readonly "voucherType": Of<Declared["voucherType"]>;
  readonly "voucherId": Of<Declared["voucherId"]>;
  /** Set on a line its voucher's cancel reversed, and on the reversing line itself: neither counts in a balance. */
  readonly "isCancelled": Of<Declared["isCancelled"]>;
};
