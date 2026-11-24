// Scaffolded from blueprint/things/attendance/verbs/mark.ts. Yours from now on.
import { Effect } from "effect";
import { Handlers } from "@orthograph/language-effect";
import { Errors } from "../../generated/api/src/index.ts";
import type { Handler } from "../../generated/api/src/attendance/mark.handler.ts";

const { AttendeeNotInCompany, AttendeeHasLeft, AttendanceBeforeJoining } = Errors.declared;

/**
 * attendance.mark: Mark whether an employee was at work on a day.
 *
 * Who may call, from blueprint/things/company/roles.ts:
 *   the owner of its company: (company, caller) => company.owner === caller.person
 *
 * Payload, from blueprint/things/attendance/verbs/mark.ts:
 *   company         attendance.company
 *   employee        attendance.employee
 *   attendanceDate  attendance.attendanceDate
 *   status          attendance.status
 *
 * Answer, from blueprint/things/attendance/verbs/mark.ts:
 *   attendance  attendance.id
 *
 * Refusals:
 *   AttendeeNotInCompany     exit 41   AN-001  yours to refuse below; from blueprint/things/attendance/errors.ts
 *   AttendeeHasLeft          exit 42   AN-002  yours to refuse below; from blueprint/things/attendance/errors.ts
 *   AttendanceBeforeJoining  exit 43   AN-003  yours to refuse below, carrying dateOfJoining; from blueprint/things/attendance/errors.ts
 *   AttendanceAlreadyMarked  exit 44   AN-004  the runtime's: another attendance holds this employee and attendance date (attendance.oneAttendancePerDay); from blueprint/things/attendance/invariants.ts
 *   EmployeeNotFound         exit 4    EM-901  the runtime's, when no employee has that id, carrying id; from blueprint/things/employee/thing.ts
 *   NotAllowed               exit 3    AR-001  the runtime's, when the caller isn't the owner of its company; from blueprint/things/company/roles.ts
 *   IdempotencyConflict      exit 120  AR-002  the runtime's, when the same request key comes with another payload; from blueprint/things/attendance/verbs/mark.ts
 *
 * Idempotent by request, from blueprint/things/attendance/verbs/mark.ts: the same request key from the same caller is one call.
 * Budget, from blueprint/things/attendance/verbs/mark.ts: p95 150ms.
 *
 * The attendance's machine, from blueprint/things/attendance/machine.ts (▶ marks this call):
 *     from       move  to      emits
 *   ▶ (creates)  mark  marked  AttendanceMarked
 *
 * What the runtime does, so this handler doesn't:
 *   before it runs, it refuses NotAllowed unless the caller is the owner of its company;
 *   before it runs, it reads the company and hands it in as refs.company;
 *   before it runs, it reads the employee and hands it in as refs.employee, refusing EmployeeNotFound if there is none;
 *   before it runs, it mints the attendance's new id and hands it in as id;
 *   each step is its own span: attendance.mark.load, attendance.mark.insert;
 *   once it answers, it sets the attendance's state to marked;
 *   once it answers, it writes AttendanceMarked: attendance from the answer, employee, attendanceDate and status from the payload;
 *   the call is the span attendance.mark, and its commit attendance.mark.commit.
 */
const mark: Handler = (_payload, { steps, move, id }) =>
  Effect.gen(function* () {
    // Step load: database, span attendance.mark.load.
    yield* steps.load(Handlers.blank("load: the work this step does"));

    // AttendeeNotInCompany: exit 41, AN-001.
    if (yield* Handlers.blank<boolean>("refuse AttendeeNotInCompany when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why AttendeeNotInCompany was refused"));
      return yield* new AttendeeNotInCompany({});
    }

    // AttendeeHasLeft: exit 42, AN-002.
    if (yield* Handlers.blank<boolean>("refuse AttendeeHasLeft when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why AttendeeHasLeft was refused"));
      return yield* new AttendeeHasLeft({});
    }

    // AttendanceBeforeJoining: exit 43, AN-003.
    if (yield* Handlers.blank<boolean>("refuse AttendanceBeforeJoining when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why AttendanceBeforeJoining was refused"));
      return yield* new AttendanceBeforeJoining({
        dateOfJoining: yield* Handlers.blank("AttendanceBeforeJoining.dateOfJoining, a Day"),
      });
    }

    // Step insert: database, span attendance.mark.insert.
    yield* steps.insert(Handlers.blank("insert: the work this step does"));

    // The move mark, to marked.
    yield* move();

    return {
      // AttendanceMarked needs attendance, and only the answer can give it.
      attendance: id,
    };
  });

export default mark;
