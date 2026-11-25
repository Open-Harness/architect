import { Blueprint } from "orthograph";
import { EmployeePromotion } from "./thing.ts";
import * as Events from "./events.ts";

// HRMS's Employee Promotion is submittable: a draft, then submitted (`on_submit` sets the employee's job title), then
// cancelled (`on_cancel` puts back the one it replaced). A draft isn't cancelled, as in Frappe; amending comes later.
export const machine = Blueprint.machine(EmployeePromotion, {
  states: ["draft", "submitted", "cancelled"],
  moves: {
    create: { from: [], to: "draft", emits: Events.EmployeePromotionDrafted },
    submit: { from: ["draft"], to: "submitted", emits: Events.EmployeePromoted },
    cancel: { from: ["submitted"], to: "cancelled", emits: Events.EmployeePromotionCancelled },
  },
  notFrom: { exit: 40 },
});
