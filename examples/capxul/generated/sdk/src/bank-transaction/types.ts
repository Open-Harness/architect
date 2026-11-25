// Generated from the blueprint. Do not edit.
import type * as Source from "../../../../blueprint/things/bank-transaction/thing.ts";
import type * as Events from "../../../../blueprint/things/bank-transaction/events.ts";

type Declared = Extract<(typeof Source)[keyof typeof Source], { readonly kind: "thing" }>["fields"];
/** What a field or value holds, as the blueprint's own schema decodes it. */
type Of<F> = F extends { readonly value: { readonly schema: { readonly Type: infer T } } } ? T : F extends { readonly schema: { readonly Type: infer T } } ? T : never;

/** The states a bank-transaction moves between, as its machine declares them. */
export type BankTransactionState = "pending" | "settled" | "failed";

/** One movement of money on a company's bank account: a deposit Bridge landed, or a transfer out. A field not every caller is shown (secret, or private to roles) may be missing from what a call returns. */
export type BankTransaction = {
  readonly "id": Of<Declared["id"]>;
  readonly "company": Of<Declared["company"]>;
  /** The company's bank account the money moved on. */
  readonly "account": Of<Declared["account"]>;
  /** The day the money moved, as Bridge dates it. */
  readonly "date": Of<Declared["date"]>;
  /** What came in, in USDC base units; 0 for a transfer out. */
  readonly "deposit": Of<Declared["deposit"]>;
  /** What went out, in USDC base units; 0 for a deposit. */
  readonly "withdrawal": Of<Declared["withdrawal"]>;
  /** The bank account's currency, which the money moved in at the bank. */
  readonly "currency": Of<Declared["currency"]>;
  /** Bridge's id for the movement: the deposit's, or the transfer's. */
  readonly "reference": Of<Declared["reference"]>;
  /** Who sent the deposit, or the external account the transfer pays. */
  readonly "party": Of<Declared["party"]>;
  readonly "state": BankTransactionState;
};

/** The event DepositLanded: what it carries when a bank-transaction moves. */
export type DepositLanded = {
  readonly "transaction": Of<(typeof Events)["DepositLanded"]["fields"]["transaction"]>;
  /** The company's bank account the money moved on. */
  readonly "account": Of<(typeof Events)["DepositLanded"]["fields"]["account"]>;
  /** What came in, in USDC base units; 0 for a transfer out. */
  readonly "deposit": Of<(typeof Events)["DepositLanded"]["fields"]["deposit"]>;
  /** Bridge's id for the movement: the deposit's, or the transfer's. */
  readonly "reference": Of<(typeof Events)["DepositLanded"]["fields"]["reference"]>;
};

/** The event TransferFailed: what it carries when a bank-transaction moves. */
export type TransferFailed = {
  readonly "transaction": Of<(typeof Events)["TransferFailed"]["fields"]["transaction"]>;
  readonly "state": Of<(typeof Events)["TransferFailed"]["fields"]["state"]>;
};

/** The event TransferSent: what it carries when a bank-transaction moves. */
export type TransferSent = {
  readonly "transaction": Of<(typeof Events)["TransferSent"]["fields"]["transaction"]>;
  /** The company's bank account the money moved on. */
  readonly "account": Of<(typeof Events)["TransferSent"]["fields"]["account"]>;
  /** What went out, in USDC base units; 0 for a deposit. */
  readonly "withdrawal": Of<(typeof Events)["TransferSent"]["fields"]["withdrawal"]>;
};

/** The event TransferSettled: what it carries when a bank-transaction moves. */
export type TransferSettled = {
  readonly "transaction": Of<(typeof Events)["TransferSettled"]["fields"]["transaction"]>;
};
