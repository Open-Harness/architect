// Generated from the blueprint. Do not edit.
import type * as Source from "../../../../blueprint/things/company/thing.ts";
import type * as Events from "../../../../blueprint/things/company/events.ts";

type Declared = Extract<(typeof Source)[keyof typeof Source], { readonly kind: "thing" }>["fields"];
/** What a field or value holds, as the blueprint's own schema decodes it. */
type Of<F> = F extends { readonly value: { readonly schema: { readonly Type: infer T } } } ? T : F extends { readonly schema: { readonly Type: infer T } } ? T : never;

/** The states a company moves between, as its machine declares them. */
export type CompanyState = "active";

/** A business that keeps its books, people and payroll in Capxul. A field not every caller is shown (secret, or private to roles) may be missing from what a call returns. */
export type Company = {
  readonly "id": Of<Declared["id"]>;
  readonly "companyName": Of<Declared["companyName"]>;
  readonly "abbr": Of<Declared["abbr"]>;
  readonly "country": Of<Declared["country"]>;
  readonly "defaultCurrency": Of<Declared["defaultCurrency"]>;
  /** The person who set the company up, and runs it. */
  readonly "owner": Of<Declared["owner"]>;
  readonly "state": CompanyState;
};

/** The event CompanyCreated: what it carries when a company moves. */
export type CompanyCreated = {
  readonly "company": Of<(typeof Events)["CompanyCreated"]["fields"]["company"]>;
  /** The person who set the company up, and runs it. */
  readonly "owner": Of<(typeof Events)["CompanyCreated"]["fields"]["owner"]>;
};
