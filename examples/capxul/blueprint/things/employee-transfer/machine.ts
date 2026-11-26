import { Blueprint } from "orthograph";
import { EmployeeTransfer } from "./thing.ts";
import * as Events from "./events.ts";

// HRMS's Employee Transfer is submittable: a draft, then submitted (`on_submit` sets the employee's department), then
// cancelled (`on_cancel` puts back the one it replaced). A draft isn't cancelled, as in Frappe; amending comes later.
export const machine = Blueprint.machine(EmployeeTransfer, {
  states: ["draft", "submitted", "cancelled"],
  moves: {
    create: { from: [], to: "draft", emits: Events.EmployeeTransferDrafted },
    submit: { from: ["draft"], to: "submitted", emits: Events.EmployeeTransferred },
    cancel: { from: ["submitted"], to: "cancelled", emits: Events.EmployeeTransferCancelled },
  },
  notFrom: { exit: 40 },
});
