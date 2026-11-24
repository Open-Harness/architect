// Scaffolded from blueprint/things/attendance-request/verbs/approve.ts. Yours from now on.
import { Effect } from "effect";
import { Handlers } from "@orthograph/language-effect";
import type { Handler } from "../../generated/api/src/attendance-request/approve.handler.ts";

/**
 * attendance-request.approve: Approve a request, marking each of its days.
 *
 * Who may call, from blueprint/things/company/roles.ts:
 *   the owner of its attendanceRequest.company: (company, caller) => company.owner === caller.person
 *
 * Payload, from blueprint/things/attendance-request/verbs/approve.ts:
 *   attendanceRequest  attendance-request.id
 *
 * Answer, from blueprint/things/attendance-request/verbs/approve.ts:
 *   attendanceRequest  attendance-request.id
 *   marked             DayCount
 *   changed            DayCount
 *
 * Refusals:
 *   AttendanceAlreadyMarked    exit 44   AN-004  the runtime's: another attendance holds this employee and attendance date (attendance.oneAttendancePerDay); from blueprint/things/attendance/invariants.ts
 *   AttendanceRequestNotDraft  exit 40   AQ-900  the runtime's, when the attendance-request isn't in draft, carrying state; from blueprint/things/attendance-request/machine.ts
 *   NotAllowed                 exit 3    AR-001  the runtime's, when the caller isn't the owner of its attendanceRequest.company; from blueprint/things/company/roles.ts
 *   IdempotencyConflict        exit 120  AR-002  the runtime's, when the same request key comes with another payload; from blueprint/things/attendance-request/verbs/approve.ts
 *
 * Idempotent by request, from blueprint/things/attendance-request/verbs/approve.ts: the same request key from the same caller is one call.
 * Budget, from blueprint/things/attendance-request/verbs/approve.ts: p95 300ms.
 *
 * The attendance-request's machine, from blueprint/things/attendance-request/machine.ts (▶ marks this call):
 *     from       move     to        emits
 *     (creates)  create   draft     AttendanceRequested
 *   ▶ draft      approve  approved  AttendanceRequestApproved
 *     draft      reject   rejected  AttendanceRequestRejected
 *
 * What the runtime does, so this handler doesn't:
 *   before it runs, it refuses NotAllowed unless the caller is the owner of its attendanceRequest.company;
 *   before it runs, it refuses AttendanceRequestNotDraft unless the attendance-request is in draft;
 *   before it runs, it hands in the attendance-request it read as subject, so this handler never reads it again;
 *   each step is its own span: attendance-request.approve.load, attendance-request.approve.mark;
 *   once it answers, it sets the attendance-request's state to approved;
 *   once it answers, it writes AttendanceRequestApproved: attendanceRequest, marked and changed from the answer;
 *   the call is the span attendance-request.approve, and its commit attendance-request.approve.commit.
 */
const approve: Handler = (_payload, { steps, move }) =>
  Effect.gen(function* () {
    // Step load: database, span attendance-request.approve.load.
    yield* steps.load(Handlers.blank("load: the work this step does"));

    // Step mark: database, in the store attendance-request, attendance, span attendance-request.approve.mark.
    yield* steps.mark(Handlers.blank("mark: the work this step does"));

    // The move approve, from draft, to approved.
    yield* move();

    return {
      attendanceRequest: yield* Handlers.blank("attendanceRequest, an attendance-request.id"),
      // AttendanceRequestApproved needs marked, and only the answer can give it.
      marked: yield* Handlers.blank("marked, a DayCount"),
      // AttendanceRequestApproved needs changed, and only the answer can give it.
      changed: yield* Handlers.blank("changed, a DayCount"),
    };
  });

export default approve;
