import { Blueprint } from "orthograph";
import { ShiftType } from "../thing.ts";
import { owner } from "../../company/roles.ts";

// A read changes nothing, so it has no move and no handler: it answers from the shift type's record.
export default Blueprint.read(ShiftType, {
  by: "id",
  fields: ["company", "shiftTypeName", "startTime", "endTime", "state"],
  allowed: [owner.of("company")],
  budget: { p95: "50 millis" },
});
