// Generated from the blueprint. Do not edit.
import type * as Source from "../../../../blueprint/things/employee-promotion/thing.ts";
import type * as Events from "../../../../blueprint/things/employee-promotion/events.ts";

type Declared = Extract<(typeof Source)[keyof typeof Source], { readonly kind: "thing" }>["fields"];
/** What a field or value holds, as the blueprint's own schema decodes it. */
type Of<F> = F extends { readonly value: { readonly schema: { readonly Type: infer T } } } ? T : F extends { readonly schema: { readonly Type: infer T } } ? T : never;

/** The states an employee-promotion moves between, as its machine declares them. */
export type EmployeePromotionState = "draft" | "submitted" | "cancelled";

/** A change of an employee's job title, from one day. A field not every caller is shown (secret, or private to roles) may be missing from what a call returns. */
export type EmployeePromotion = {
  readonly "id": Of<Declared["id"]>;
  readonly "company": Of<Declared["company"]>;
  readonly "employee": Of<Declared["employee"]>;
  readonly "promotionDate": Of<Declared["promotionDate"]>;
  /** The job title the employee held when the promotion was drafted. */
  readonly "currentDesignation": Of<Declared["currentDesignation"]>;
  /** The job title the employee holds once it is submitted. */
  readonly "newDesignation": Of<Declared["newDesignation"]>;
  readonly "state": EmployeePromotionState;
};

/** The event EmployeePromoted: what it carries when an employee-promotion moves. */
export type EmployeePromoted = {
  readonly "employeePromotion": Of<(typeof Events)["EmployeePromoted"]["fields"]["employeePromotion"]>;
  readonly "employee": Of<(typeof Events)["EmployeePromoted"]["fields"]["employee"]>;
  /** The job title the employee holds once it is submitted. */
  readonly "designation": Of<(typeof Events)["EmployeePromoted"]["fields"]["designation"]>;
};

/** The event EmployeePromotionCancelled: what it carries when an employee-promotion moves. */
export type EmployeePromotionCancelled = {
  readonly "employeePromotion": Of<(typeof Events)["EmployeePromotionCancelled"]["fields"]["employeePromotion"]>;
  readonly "employee": Of<(typeof Events)["EmployeePromotionCancelled"]["fields"]["employee"]>;
  /** The job title the employee held when the promotion was drafted. */
  readonly "designation": Of<(typeof Events)["EmployeePromotionCancelled"]["fields"]["designation"]>;
};

/** The event EmployeePromotionDrafted: what it carries when an employee-promotion moves. */
export type EmployeePromotionDrafted = {
  readonly "employeePromotion": Of<(typeof Events)["EmployeePromotionDrafted"]["fields"]["employeePromotion"]>;
  readonly "employee": Of<(typeof Events)["EmployeePromotionDrafted"]["fields"]["employee"]>;
};
