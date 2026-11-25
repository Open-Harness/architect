import { Blueprint } from "orthograph";
import { FiscalYear } from "../thing.ts";
import { owner } from "../../company/roles.ts";

// A read changes nothing, so it has no move and no handler: it answers from the year's record.
export default Blueprint.read(FiscalYear, {
  by: "id",
  fields: ["company", "year", "yearStartDate", "yearEndDate", "isShortYear", "state"],
  allowed: [owner.of("company")],
  budget: { p95: "50 millis" },
});
