import { Blueprint } from "orthograph";
import { SalaryStructureAssignment } from "./thing.ts";
import * as Events from "./events.ts";

// HRMS's docstatus: a draft, then submitted, when payroll counts it, then cancelled, when it no longer does.
export const machine = Blueprint.machine(SalaryStructureAssignment, {
  states: ["draft", "submitted", "cancelled"],
  moves: {
    create: { from: [], to: "draft", emits: Events.SalaryStructureAssigned },
    submit: { from: ["draft"], to: "submitted", emits: Events.SalaryStructureAssignmentSubmitted },
    cancel: { from: ["submitted"], to: "cancelled", emits: Events.SalaryStructureAssignmentCancelled },
  },
  notFrom: { exit: 40 },
});
