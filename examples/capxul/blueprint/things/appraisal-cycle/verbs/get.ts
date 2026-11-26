import { Blueprint } from "orthograph";
import { AppraisalCycle } from "../thing.ts";
import { owner } from "../../company/roles.ts";

// A read changes nothing, so it has no move and no handler: it answers from the cycle's record.
export default Blueprint.read(AppraisalCycle, {
  by: "id",
  fields: ["company", "cycleName", "startDate", "endDate", "kraEvaluationMethod", "appraisees", "state"],
  allowed: [owner.of("company")],
  budget: { p95: "50 millis" },
});
