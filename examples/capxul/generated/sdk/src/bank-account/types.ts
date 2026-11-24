// Generated from the blueprint. Do not edit.
import type * as Source from "../../../../blueprint/things/bank-account/thing.ts";
import type * as Events from "../../../../blueprint/things/bank-account/events.ts";

type Declared = Extract<(typeof Source)[keyof typeof Source], { readonly kind: "thing" }>["fields"];
/** What a field or value holds, as the blueprint's own schema decodes it. */
type Of<F> = F extends { readonly value: { readonly schema: { readonly Type: infer T } } } ? T : F extends { readonly schema: { readonly Type: infer T } } ? T : never;

/** The states a bank-account moves between, as its machine declares them. */
export type BankAccountState = "open" | "closed";

/** A bank account a company holds through Bridge, which takes deposits in one currency. A field not every caller is shown (secret, or private to roles) may be missing from what a call returns. */
export type BankAccount = {
  readonly "id": Of<Declared["id"]>;
  readonly "company": Of<Declared["company"]>;
  /** The company's approved KYB the account is opened on. */
  readonly "business": Of<Declared["business"]>;
  /** What the company calls the account (ERPNext's `account_name`). */
  readonly "accountName": Of<Declared["accountName"]>;
  /** The currency it takes deposits in. */
  readonly "currency": Of<Declared["currency"]>;
  /** The bank that holds it, as Bridge names it. */
  readonly "bankName": Of<Declared["bankName"]>;
  /** Its account number, or IBAN, as Bridge gives it. */
  readonly "accountNumber": Of<Declared["accountNumber"]>;
  /** Its routing number, or BIC, as Bridge gives it. */
  readonly "routingNumber": Of<Declared["routingNumber"]>;
  readonly "state": BankAccountState;
};

/** The event BankAccountClosed: what it carries when a bank-account moves. */
export type BankAccountClosed = {
  readonly "account": Of<(typeof Events)["BankAccountClosed"]["fields"]["account"]>;
};

/** The event BankAccountOpened: what it carries when a bank-account moves. */
export type BankAccountOpened = {
  readonly "account": Of<(typeof Events)["BankAccountOpened"]["fields"]["account"]>;
  readonly "company": Of<(typeof Events)["BankAccountOpened"]["fields"]["company"]>;
  /** The company's approved KYB the account is opened on. */
  readonly "business": Of<(typeof Events)["BankAccountOpened"]["fields"]["business"]>;
  /** The currency it takes deposits in. */
  readonly "currency": Of<(typeof Events)["BankAccountOpened"]["fields"]["currency"]>;
};
