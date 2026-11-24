import { Blueprint } from "orthograph";
import { JobOffer } from "../thing.ts";
import { owner } from "../../company/roles.ts";

// A read changes nothing, so it has no move and no handler: it answers from the offer's record.
export default Blueprint.read(JobOffer, {
  by: "id",
  fields: ["company", "jobApplicant", "designation", "offerDate", "state"],
  allowed: [owner.of("company")],
  budget: { p95: "50 millis" },
});
