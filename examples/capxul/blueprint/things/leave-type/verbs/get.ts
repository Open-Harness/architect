import { Blueprint } from "orthograph";
import { LeaveType } from "../thing.ts";
import { owner } from "../../company/roles.ts";

// A read changes nothing, so it has no move and no handler: it answers from the type's record.
export default Blueprint.read(LeaveType, {
  by: "id",
  fields: ["company", "leaveTypeName", "maxContinuousDaysAllowed", "isLwp", "includeHoliday", "state"],
  allowed: [owner.of("company")],
  budget: { p95: "50 millis" },
});
