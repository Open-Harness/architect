import { Blueprint } from "orthograph";
import { Appraisal } from "../thing.ts";
import { owner } from "../../company/roles.ts";
import { self } from "../../employee/roles.ts";

// A read changes nothing, so it has no move and no handler: it answers from the appraisal's record.
export default Blueprint.read(Appraisal, {
  by: "id",
  fields: [
    "company",
    "employee",
    "appraisalCycle",
    "appraisalTemplate",
    "kraEvaluationMethod",
    "kras",
    "selfRatings",
    "totalScore",
    "selfScore",
    "avgFeedbackScore",
    "finalScore",
    "state",
  ],
  allowed: [self.of("employee"), owner.of("company")],
  budget: { p95: "50 millis" },
});
