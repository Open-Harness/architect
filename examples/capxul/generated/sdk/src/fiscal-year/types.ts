// Generated from the blueprint. Do not edit.
import type * as Source from "../../../../blueprint/things/fiscal-year/thing.ts";
import type * as Events from "../../../../blueprint/things/fiscal-year/events.ts";

type Declared = Extract<(typeof Source)[keyof typeof Source], { readonly kind: "thing" }>["fields"];
/** What a field or value holds, as the blueprint's own schema decodes it. */
type Of<F> = F extends { readonly value: { readonly schema: { readonly Type: infer T } } } ? T : F extends { readonly schema: { readonly Type: infer T } } ? T : never;

/** The states a fiscal-year moves between, as its machine declares them. */
export type FiscalYearState = "active";

/** A company's accounting year: the days its books are kept for. A field not every caller is shown (secret, or private to roles) may be missing from what a call returns. */
export type FiscalYear = {
  readonly "id": Of<Declared["id"]>;
  readonly "company": Of<Declared["company"]>;
  readonly "year": Of<Declared["year"]>;
  readonly "yearStartDate": Of<Declared["yearStartDate"]>;
  readonly "yearEndDate": Of<Declared["yearEndDate"]>;
  /** A year shorter than twelve months, as some countries allow (ERPNext's `is_short_year`). */
  readonly "isShortYear": Of<Declared["isShortYear"]>;
  readonly "state": FiscalYearState;
};

/** The event FiscalYearCreated: what it carries when a fiscal-year moves. */
export type FiscalYearCreated = {
  readonly "fiscalYear": Of<(typeof Events)["FiscalYearCreated"]["fields"]["fiscalYear"]>;
  readonly "company": Of<(typeof Events)["FiscalYearCreated"]["fields"]["company"]>;
  readonly "yearStartDate": Of<(typeof Events)["FiscalYearCreated"]["fields"]["yearStartDate"]>;
  readonly "yearEndDate": Of<(typeof Events)["FiscalYearCreated"]["fields"]["yearEndDate"]>;
};
