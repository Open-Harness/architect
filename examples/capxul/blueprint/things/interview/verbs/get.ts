import { Blueprint } from "orthograph";
import { Interview } from "../thing.ts";
import { owner } from "../../company/roles.ts";

// A read changes nothing, so it has no move and no handler: it answers from the interview's record.
export default Blueprint.read(Interview, {
  by: "id",
  fields: ["company", "jobApplicant", "interviewRound", "scheduledOn", "fromTime", "toTime", "interviewers", "state"],
  allowed: [owner.of("company")],
  budget: { p95: "50 millis" },
});
