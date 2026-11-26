import { Blueprint } from "orthograph";
import { PayrollPeriod } from "../thing.ts";
import { owner } from "../../company/roles.ts";

// A read changes nothing, so it has no move and no handler: it answers from the period's record.
export default Blueprint.read(PayrollPeriod, {
  by: "id",
  fields: ["company", "payrollPeriodName", "startDate", "endDate", "state"],
  allowed: [owner.of("company")],
  budget: { p95: "50 millis" },
});
