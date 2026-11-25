// Scaffolded from blueprint/things/leave-application/verbs/approve.ts. Yours from now on.
import { Effect } from "effect";
import { Handlers } from "@orthograph/language-effect";
import { Errors } from "../../generated/api/src/index.ts";
import type { Handler } from "../../generated/api/src/leave-application/approve.handler.ts";

const { InsufficientLeaveBalance, LeaveDayAttended } = Errors.declared;

/**
 * leave-application.approve: Approve a leave, marking each of its days On Leave.
 *
 * Who may call, from blueprint/things/company/roles.ts:
 *   the owner of its leaveApplication.company: (company, caller) => company.owner === caller.person
 *
 * Payload, from blueprint/things/leave-application/verbs/approve.ts:
 *   leaveApplication  leave-application.id
 *
 * Answer, from blueprint/things/leave-application/verbs/approve.ts:
 *   leaveApplication  leave-application.id
 *   marked            DayCount
 *   changed           DayCount
 *
 * Refusals:
 *   InsufficientLeaveBalance  exit 48   LP-008  yours to refuse below; from blueprint/things/leave-application/errors.ts
 *   LeaveDayAttended          exit 51   LP-011  yours to refuse below, carrying attendanceDate; from blueprint/things/leave-application/errors.ts
 *   AttendanceAlreadyMarked   exit 44   AN-004  the runtime's: another attendance holds this employee and attendance date (attendance.oneAttendancePerDay); from blueprint/things/attendance/invariants.ts
 *   LeaveApplicationNotOpen   exit 40   LP-900  the runtime's, when the leave-application isn't in open, carrying state; from blueprint/things/leave-application/machine.ts
 *   NotAllowed                exit 3    AR-001  the runtime's, when the caller isn't the owner of its leaveApplication.company; from blueprint/things/company/roles.ts
 *   IdempotencyConflict       exit 120  AR-002  the runtime's, when the same request key comes with another payload; from blueprint/things/leave-application/verbs/approve.ts
 *
 * Idempotent by request, from blueprint/things/leave-application/verbs/approve.ts: the same request key from the same caller is one call.
 * Budget, from blueprint/things/leave-application/verbs/approve.ts: p95 400ms.
 *
 * The leave-application's machine, from blueprint/things/leave-application/machine.ts (▶ marks this call):
 *     from       move     to         emits
 *     (creates)  create   open       LeaveApplied
 *   ▶ open       approve  approved   LeaveApplicationApproved
 *     open       reject   rejected   LeaveApplicationRejected
 *     open       cancel   cancelled  LeaveApplicationCancelled
 *     approved   cancel   cancelled  LeaveApplicationCancelled
 *
 * What the runtime does, so this handler doesn't:
 *   before it runs, it refuses NotAllowed unless the caller is the owner of its leaveApplication.company;
 *   before it runs, it refuses LeaveApplicationNotOpen unless the leave-application is in open;
 *   before it runs, it hands in the leave-application it read as subject, so this handler never reads it again;
 *   each step is its own span: leave-application.approve.load, leave-application.approve.mark;
 *   once it answers, it sets the leave-application's state to approved;
 *   once it answers, it writes LeaveApplicationApproved: leaveApplication, marked and changed from the answer;
 *   the call is the span leave-application.approve, and its commit leave-application.approve.commit.
 */
const approve: Handler = (_payload, { steps, move }) =>
  Effect.gen(function* () {
    // Step load: database, span leave-application.approve.load.
    yield* steps.load(Handlers.blank("load: the work this step does"));

    // InsufficientLeaveBalance: exit 48, LP-008.
    if (yield* Handlers.blank<boolean>("refuse InsufficientLeaveBalance when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why InsufficientLeaveBalance was refused"));
      return yield* new InsufficientLeaveBalance({});
    }

    // LeaveDayAttended: exit 51, LP-011.
    if (yield* Handlers.blank<boolean>("refuse LeaveDayAttended when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why LeaveDayAttended was refused"));
      return yield* new LeaveDayAttended({
        attendanceDate: yield* Handlers.blank("LeaveDayAttended.attendanceDate, a Day"),
      });
    }

    // Step mark: database, in the store leave-application, attendance, span leave-application.approve.mark.
    yield* steps.mark(Handlers.blank("mark: the work this step does"));

    // The move approve, from open, to approved.
    yield* move();

    return {
      leaveApplication: yield* Handlers.blank("leaveApplication, a leave-application.id"),
      // LeaveApplicationApproved needs marked, and only the answer can give it.
      marked: yield* Handlers.blank("marked, a DayCount"),
      // LeaveApplicationApproved needs changed, and only the answer can give it.
      changed: yield* Handlers.blank("changed, a DayCount"),
    };
  });

export default approve;
