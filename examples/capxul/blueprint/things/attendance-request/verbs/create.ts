import { Blueprint } from "orthograph";
import { AttendanceRequest } from "../thing.ts";
import { machine } from "../machine.ts";
import { RequestBeforeJoining, RequestEndsBeforeStart, RequesterHasLeft, RequesterNotInCompany } from "../errors.ts";
import { owner } from "../../company/roles.ts";
import { self } from "../../employee/roles.ts";

// Refusal order (errors.ts): RequesterNotInCompany, RequesterHasLeft, RequestEndsBeforeStart, RequestBeforeJoining.
// HRMS calls `validate_dates` with `restrict_future_dates` off, so days still to come may be asked for.
export default Blueprint.operation(AttendanceRequest, {
  description: "Ask for an employee to be marked at work, from one day to another, and why.",
  payload: {
    company: AttendanceRequest.fields.company,
    employee: AttendanceRequest.fields.employee,
    fromDate: AttendanceRequest.fields.fromDate,
    toDate: AttendanceRequest.fields.toDate,
    reason: AttendanceRequest.fields.reason,
  },
  answer: { attendanceRequest: AttendanceRequest.fields.id },
  move: machine.moves.create,
  errors: [RequesterNotInCompany, RequesterHasLeft, RequestEndsBeforeStart, RequestBeforeJoining],
  allowed: [self.of("employee"), owner.of("company")],
  steps: { load: Blueprint.step.database({ writes: [] }), insert: Blueprint.step.database() },
  idempotent: "request",
  budget: { p95: "150 millis" },
});
