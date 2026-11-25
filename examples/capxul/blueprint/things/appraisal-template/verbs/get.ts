import { Blueprint } from "orthograph";
import { AppraisalTemplate } from "../thing.ts";
import { owner } from "../../company/roles.ts";

// A read changes nothing, so it has no move and no handler: it answers from the template's record.
export default Blueprint.read(AppraisalTemplate, {
  by: "id",
  fields: ["company", "title", "kras", "criteria", "state"],
  allowed: [owner.of("company")],
  budget: { p95: "50 millis" },
});
