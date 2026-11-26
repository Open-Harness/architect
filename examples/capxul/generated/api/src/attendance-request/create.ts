// Generated from blueprint/things/attendance-request/verbs/create.ts. Do not edit.
import { HttpApiEndpoint } from "effect/http-api";
import { wireStruct } from "orthograph/server";
import declaration from "../../../../blueprint/things/attendance-request/verbs/create.ts";
import { RequesterNotInCompany, RequesterHasLeft, RequestEndsBeforeStart, RequestBeforeJoining, AttendanceRequestOverlaps, CompanyNotFound, EmployeeNotFound, NotAllowed, IdempotencyConflict } from "../errors.ts";

export { declaration };
export const endpoint = HttpApiEndpoint.post("create", "/attendance-request/create", {
  payload: declaration.payloadSchema,
  // What the wire carries: the declared answer, the fields not every caller is shown optional. The server cuts each answer by who is asking.
  // Typed as the declaration types it: the schema is built from fields known only at run time, which TypeScript cannot follow.
  success: wireStruct(declaration.answer, { issuing: true }) as unknown as typeof declaration.answerSchema,
  error: [RequesterNotInCompany, RequesterHasLeft, RequestEndsBeforeStart, RequestBeforeJoining, AttendanceRequestOverlaps, CompanyNotFound, EmployeeNotFound, NotAllowed, IdempotencyConflict],
});
