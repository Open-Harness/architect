// Generated from the blueprint. Do not edit.
import type * as Source from "../../../../blueprint/things/salary-structure/thing.ts";
import type * as Events from "../../../../blueprint/things/salary-structure/events.ts";

type Declared = Extract<(typeof Source)[keyof typeof Source], { readonly kind: "thing" }>["fields"];
/** What a field or value holds, as the blueprint's own schema decodes it. */
type Of<F> = F extends { readonly value: { readonly schema: { readonly Type: infer T } } } ? T : F extends { readonly schema: { readonly Type: infer T } } ? T : never;

/** The states a salary-structure moves between, as its machine declares them. */
export type SalaryStructureState = "draft" | "submitted" | "cancelled";

/** A company's pay for a kind of role: the earnings and deductions each employee assigned to it is paid. A field not every caller is shown (secret, or private to roles) may be missing from what a call returns. */
export type SalaryStructure = {
  readonly "id": Of<Declared["id"]>;
  readonly "company": Of<Declared["company"]>;
  readonly "salaryStructureName": Of<Declared["salaryStructureName"]>;
  readonly "totalEarning": Of<Declared["totalEarning"]>;
  readonly "totalDeduction": Of<Declared["totalDeduction"]>;
  /** Its earnings less its deductions, in USDC base units. */
  readonly "netPay": Of<Declared["netPay"]>;
  readonly "state": SalaryStructureState;
};

/** The event SalaryStructureCancelled: what it carries when a salary-structure moves. */
export type SalaryStructureCancelled = {
  readonly "salaryStructure": Of<(typeof Events)["SalaryStructureCancelled"]["fields"]["salaryStructure"]>;
};

/** The event SalaryStructureDrafted: what it carries when a salary-structure moves. */
export type SalaryStructureDrafted = {
  readonly "salaryStructure": Of<(typeof Events)["SalaryStructureDrafted"]["fields"]["salaryStructure"]>;
  readonly "company": Of<(typeof Events)["SalaryStructureDrafted"]["fields"]["company"]>;
  /** Its earnings less its deductions, in USDC base units. */
  readonly "netPay": Of<(typeof Events)["SalaryStructureDrafted"]["fields"]["netPay"]>;
};

/** The event SalaryStructureSubmitted: what it carries when a salary-structure moves. */
export type SalaryStructureSubmitted = {
  readonly "salaryStructure": Of<(typeof Events)["SalaryStructureSubmitted"]["fields"]["salaryStructure"]>;
};
