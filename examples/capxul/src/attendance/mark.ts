// Scaffolded from blueprint/things/attendance/verbs/mark.ts. Yours from now on.
import { Effect } from "effect";
import { Records } from "@orthograph/language-effect";
import { Attendance } from "../../blueprint/things/attendance/thing.ts";
import { LeaveApplication } from "../../blueprint/things/leave-application/thing.ts";
import { all } from "../leave-application/internal/leave.ts";
import { Errors } from "../../generated/api/src/index.ts";
import type { Handler } from "../../generated/api/src/attendance/mark.handler.ts";

const { AttendeeNotInCompany, AttendeeHasLeft, AttendanceBeforeJoining, AttendanceOnLeave } = Errors.declared;

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
const mark: Handler = ({ company, employee, attendanceDate, status }, { steps, move, refs, id }) =>
  Effect.gen(function* () {
    const records = yield* Records;

    // Step load: database, span attendance.mark.load. The runtime read the employee and hands it in; this step lists
    // the employee's approved leave applications.
    const { attendee, onLeave } = yield* steps.load(
      Effect.gen(function* () {
        const approved = yield* records.list({ ...all, thing: LeaveApplication, where: { employee }, state: "approved" });
        return { attendee: refs.employee, onLeave: approved.items };
      }),
    );
    if (!attendee) return yield* Effect.die(new Error(`employee ${employee} was read and then not found`));

    // Refusal order (errors.ts): AttendeeNotInCompany, AttendeeHasLeft, AttendanceBeforeJoining, then AttendanceOnLeave.
    // AttendeeNotInCompany: exit 41, AN-001.
    if (attendee["company"] !== company) {
      yield* Effect.logInfo("the employee works for another company");
      return yield* new AttendeeNotInCompany({});
    }

    // AttendeeHasLeft: exit 42, AN-002. A new attendance is only for an employee still at work (CX-expense-leavers).
    if (attendee.state !== "active") {
      yield* Effect.logInfo(`the employee is ${attendee.state ?? "in no state"}, not active`);
      return yield* new AttendeeHasLeft({});
    }

    // AttendanceBeforeJoining: exit 43, AN-003. Days are YYYY-MM-DD, so they compare as text; the joining day itself is
    // allowed. There's no future-day check, as HRMS has none.
    const dateOfJoining = attendee["dateOfJoining"] as typeof attendanceDate;
    if (attendanceDate < dateOfJoining) {
      yield* Effect.logInfo("the day is before the employee joined");
      return yield* new AttendanceBeforeJoining({ dateOfJoining });
    }

    // AttendanceOnLeave: exit 45, AN-005. An approved leave covers the day, holidays inside it included; On Leave is
    // marked only by a leave's approval (CX-leave, call 5). A cancelled leave doesn't refuse the day.
    const covering = onLeave.find((a) => (a["fromDate"] as string) <= attendanceDate && attendanceDate <= (a["toDate"] as string));
    if (covering !== undefined) {
      yield* Effect.logInfo(`an approved leave covers ${attendanceDate}`);
      return yield* new AttendanceOnLeave({ leaveApplication: covering["id"] as never });
    }

    // Step insert: database, span attendance.mark.insert. A day already marked is the runtime's refusal
    // (oneAttendancePerDay).
    yield* steps.insert(records.insert(Attendance, { id, company, employee, attendanceDate, status }));

    // The move mark, to marked.
    yield* move();

    return {
      // AttendanceMarked needs attendance, and only the answer can give it.
      attendance: id,
    };
  });

export default mark;
