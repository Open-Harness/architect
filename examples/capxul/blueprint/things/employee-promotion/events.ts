import { Blueprint } from "orthograph";
import { EmployeePromotion } from "./thing.ts";

export const EmployeePromotionDrafted = Blueprint.event({
  employeePromotion: EmployeePromotion.fields.id,
  employee: EmployeePromotion.fields.employee,
});
/** `designation` is the job title the employee now holds: the promotion's new one. */
export const EmployeePromoted = Blueprint.event({
  employeePromotion: EmployeePromotion.fields.id,
  employee: EmployeePromotion.fields.employee,
  designation: EmployeePromotion.fields.newDesignation,
});
/** `designation` is the job title put back: the promotion's current one. */
export const EmployeePromotionCancelled = Blueprint.event({
  employeePromotion: EmployeePromotion.fields.id,
  employee: EmployeePromotion.fields.employee,
  designation: EmployeePromotion.fields.currentDesignation,
});
