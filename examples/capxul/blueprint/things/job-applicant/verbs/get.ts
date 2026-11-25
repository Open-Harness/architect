import { Blueprint } from "orthograph";
import { JobApplicant } from "../thing.ts";
import { owner } from "../../company/roles.ts";

// A read changes nothing, so it has no move and no handler: it answers from the applicant's record.
export default Blueprint.read(JobApplicant, {
  by: "id",
  fields: ["company", "jobOpening", "applicantName", "email", "state"],
  allowed: [owner.of("company")],
  budget: { p95: "50 millis" },
});
