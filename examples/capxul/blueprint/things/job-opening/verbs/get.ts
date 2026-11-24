import { Blueprint } from "orthograph";
import { JobOpening } from "../thing.ts";
import { owner } from "../../company/roles.ts";

// A read changes nothing, so it has no move and no handler: it answers from the opening's record.
export default Blueprint.read(JobOpening, {
  by: "id",
  fields: ["company", "designation", "jobTitle", "vacancies", "state"],
  allowed: [owner.of("company")],
  budget: { p95: "50 millis" },
});
