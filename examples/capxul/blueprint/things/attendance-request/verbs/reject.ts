import { Blueprint } from "orthograph";
import { AttendanceRequest } from "../thing.ts";
import { machine } from "../machine.ts";
import { owner } from "../../company/roles.ts";

// A rejected request marks no day.
export default Blueprint.operation(AttendanceRequest, {
  description: "Reject a request, marking none of its days.",
  payload: { attendanceRequest: AttendanceRequest.fields.id },
  answer: { attendanceRequest: AttendanceRequest.fields.id },
  move: machine.moves.reject,
  allowed: [owner.of("attendanceRequest.company")],
  steps: { update: Blueprint.step.database() },
  idempotent: "request",
  budget: { p95: "150 millis" },
});
