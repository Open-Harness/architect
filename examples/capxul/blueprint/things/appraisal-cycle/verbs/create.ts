import { Blueprint } from "orthograph";
import { AppraisalCycle } from "../thing.ts";
import { machine } from "../machine.ts";
import { AppraiseeHasLeft, AppraiseeListedTwice, AppraiseeNotInCompany, AppraiseeTemplateNotInCompany, CycleEndsBeforeStart } from "../errors.ts";
import { owner } from "../../company/roles.ts";

// Refusal order (errors.ts). CycleNameTaken belongs to the rule in ../invariants.ts, and the runtime refuses it.
export default Blueprint.operation(AppraisalCycle, {
  description: "Set up an appraisal cycle: its days, how its KRAs are scored, and who is appraised by which template.",
  payload: {
    company: AppraisalCycle.fields.company,
    cycleName: AppraisalCycle.fields.cycleName,
    startDate: AppraisalCycle.fields.startDate,
    endDate: AppraisalCycle.fields.endDate,
    kraEvaluationMethod: AppraisalCycle.fields.kraEvaluationMethod,
    appraisees: AppraisalCycle.fields.appraisees,
  },
  answer: { appraisalCycle: AppraisalCycle.fields.id },
  move: machine.moves.create,
  errors: [CycleEndsBeforeStart, AppraiseeNotInCompany, AppraiseeHasLeft, AppraiseeTemplateNotInCompany, AppraiseeListedTwice],
  allowed: [owner.of("company")],
  steps: { load: Blueprint.step.database({ writes: [] }), insert: Blueprint.step.database() },
  idempotent: "request",
  budget: { p95: "300 millis" },
});
