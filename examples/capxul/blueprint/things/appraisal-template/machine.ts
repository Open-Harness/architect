import { Blueprint } from "orthograph";
import { AppraisalTemplate } from "./thing.ts";
import * as Events from "./events.ts";

// A template is made and kept. HRMS has no lifecycle for it; editing it comes later.
export const machine = Blueprint.machine(AppraisalTemplate, {
  states: ["active"],
  moves: { create: { from: [], to: "active", emits: Events.AppraisalTemplateCreated } },
  notFrom: { exit: 40 },
});
