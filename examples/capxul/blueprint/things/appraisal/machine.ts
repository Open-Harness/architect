import { Blueprint } from "orthograph";
import { Appraisal } from "./thing.ts";
import * as Events from "./events.ts";

// HRMS's Appraisal is submittable: a draft, then submitted. Cancelling and amending come later.
export const machine = Blueprint.machine(Appraisal, {
  states: ["draft", "submitted"],
  moves: {
    create: { from: [], to: "draft", emits: Events.AppraisalCreated },
    rate: { from: ["draft"], to: "draft", emits: Events.AppraisalRated },
    selfRate: { from: ["draft"], to: "draft", emits: Events.AppraisalSelfRated },
    submit: { from: ["draft"], to: "submitted", emits: Events.AppraisalSubmitted },
  },
  notFrom: { exit: 40 },
});
