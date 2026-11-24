// Scaffolded from blueprint/things/attendance-request/verbs/reject.ts. Yours from now on.
import { Effect } from "effect";
import type { Handler } from "../../generated/api/src/attendance-request/reject.handler.ts";

/**
 * attendance-request.reject: Reject a request, marking none of its days.
 *
 * Who may call, from blueprint/things/company/roles.ts:
 *   the owner of its attendanceRequest.company: (company, caller) => company.owner === caller.person
 *
 * Payload, from blueprint/things/attendance-request/verbs/reject.ts:
 *   attendanceRequest  attendance-request.id
 *
 * Answer, from blueprint/things/attendance-request/verbs/reject.ts:
 *   attendanceRequest  attendance-request.id
 *
 * Refusals:
 *   AttendanceRequestNotDraft  exit 40   AQ-900  the runtime's, when the attendance-request isn't in draft, carrying state; from blueprint/things/attendance-request/machine.ts
 *   NotAllowed                 exit 3    AR-001  the runtime's, when the caller isn't the owner of its attendanceRequest.company; from blueprint/things/company/roles.ts
 *   IdempotencyConflict        exit 120  AR-002  the runtime's, when the same request key comes with another payload; from blueprint/things/attendance-request/verbs/reject.ts
 *
 * Idempotent by request, from blueprint/things/attendance-request/verbs/reject.ts: the same request key from the same caller is one call.
 * Budget, from blueprint/things/attendance-request/verbs/reject.ts: p95 150ms.
 *
 * The attendance-request's machine, from blueprint/things/attendance-request/machine.ts (▶ marks this call):
 *     from       move     to        emits
 *     (creates)  create   draft     AttendanceRequested
 *     draft      approve  approved  AttendanceRequestApproved
 *   ▶ draft      reject   rejected  AttendanceRequestRejected
 *
 * What the runtime does, so this handler doesn't:
 *   before it runs, it refuses NotAllowed unless the caller is the owner of its attendanceRequest.company;
 *   before it runs, it refuses AttendanceRequestNotDraft unless the attendance-request is in draft;
 *   before it runs, it hands in the attendance-request it read as subject, so this handler never reads it again;
 *   each step is its own span: attendance-request.reject.update;
 *   once it answers, it sets the attendance-request's state to rejected;
 *   once it answers, it writes AttendanceRequestRejected: attendanceRequest from the answer;
 *   the call is the span attendance-request.reject, and its commit attendance-request.reject.commit.
 */
const reject: Handler = ({ attendanceRequest }, { steps, move }) =>
  Effect.gen(function* () {
    // Step update: database, span attendance-request.reject.update. A rejected request marks none of its days and
    // leaves any already marked as they are; the only change is its state, which the runtime sets once this answers.
    yield* steps.update(Effect.void);

    // The move reject, from draft, to rejected.
    yield* move();

    return { attendanceRequest };
  });

export default reject;
