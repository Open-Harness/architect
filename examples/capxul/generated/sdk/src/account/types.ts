// Generated from the blueprint. Do not edit.
import type * as Source from "../../../../blueprint/things/account/thing.ts";
import type * as Events from "../../../../blueprint/things/account/events.ts";

type Declared = Extract<(typeof Source)[keyof typeof Source], { readonly kind: "thing" }>["fields"];
/** What a field or value holds, as the blueprint's own schema decodes it. */
type Of<F> = F extends { readonly value: { readonly schema: { readonly Type: infer T } } } ? T : F extends { readonly schema: { readonly Type: infer T } } ? T : never;

/** The states an account moves between, as its machine declares them. */
export type AccountState = "group" | "ledger";

/** A heading in a company's chart of accounts: a group of accounts, or a ledger that takes entries. A field not every caller is shown (secret, or private to roles) may be missing from what a call returns. */
export type Account = {
  readonly "id": Of<Declared["id"]>;
  readonly "company": Of<Declared["company"]>;
  readonly "accountName": Of<Declared["accountName"]>;
  readonly "parentAccount"?: Of<Declared["parentAccount"]>;
  readonly "rootType": Of<Declared["rootType"]>;
  readonly "reportType": Of<Declared["reportType"]>;
  readonly "accountType"?: Of<Declared["accountType"]>;
  readonly "state": AccountState;
};

/** The event AccountCreated: what it carries when an account moves. */
export type AccountCreated = {
  readonly "account": Of<(typeof Events)["AccountCreated"]["fields"]["account"]>;
  readonly "company": Of<(typeof Events)["AccountCreated"]["fields"]["company"]>;
  readonly "rootType": Of<(typeof Events)["AccountCreated"]["fields"]["rootType"]>;
};

/** The event AccountMadeLedger: what it carries when an account moves. */
export type AccountMadeLedger = {
  readonly "account": Of<(typeof Events)["AccountMadeLedger"]["fields"]["account"]>;
};
