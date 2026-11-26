import { Blueprint } from "orthograph";
import { SalaryStructure } from "./thing.ts";
import * as Events from "./events.ts";

// HRMS's docstatus: a draft, then submitted, when it can be assigned, then cancelled. Amending comes later.
export const machine = Blueprint.machine(SalaryStructure, {
  states: ["draft", "submitted", "cancelled"],
  moves: {
    create: { from: [], to: "draft", emits: Events.SalaryStructureDrafted },
    submit: { from: ["draft"], to: "submitted", emits: Events.SalaryStructureSubmitted },
    cancel: { from: ["submitted"], to: "cancelled", emits: Events.SalaryStructureCancelled },
  },
  notFrom: { exit: 40 },
});
