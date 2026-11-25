// Scaffolded from blueprint/things/leave-application/verbs/approve.ts. Yours from now on.
import { BigDecimal, Effect } from "effect";
import { Ids, Records } from "@orthograph/language-effect";
import { Attendance } from "../../blueprint/things/attendance/thing.ts";
import { LeaveType } from "../../blueprint/things/leave-type/thing.ts";
import { attendancesOf, balanceOf, coveringAllocation, firstDayAttended, leaveDaysOf } from "./internal/leave.ts";
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
const approve: Handler = ({ leaveApplication }, { steps, move, subject }) =>
  Effect.gen(function* () {
    const records = yield* Records;

    // Step load: database, span leave-application.approve.load. The runtime read the application for its role and state
    // checks and hands it in; this step reads its type, its balance as it is now, the leave days and the employee's
    // attendance. The employee isn't judged again (CX-expense-leavers).
    const { application, balance, leaveDays, attendances } = yield* steps.load(
      Effect.gen(function* () {
        if (!subject) return yield* Effect.die(new Error(`leave application ${leaveApplication} was checked and then not found`));
        const [employee, leaveType, fromDate, toDate] = [subject["employee"], subject["leaveType"], subject["fromDate"], subject["toDate"]] as ReadonlyArray<string>;
        const type = yield* records.find(LeaveType, leaveType!);
        if (!type) return yield* Effect.die(new Error(`leave type ${leaveType} of leave application ${leaveApplication} not found`));
        const allocation = type["isLwp"] === true ? undefined : yield* coveringAllocation(employee!, leaveType!, fromDate!, toDate!);
        const balance = type["isLwp"] === true ? undefined : allocation === undefined ? BigDecimal.fromBigInt(0n) : yield* balanceOf(allocation);
        const leaveDays = yield* leaveDaysOf(type, subject["company"] as string, fromDate!, toDate!);
        const attendances = yield* attendancesOf(employee!);
        return { application: subject, balance, leaveDays, attendances };
      }),
    );

    // Refusal order (errors.ts): InsufficientLeaveBalance, then LeaveDayAttended, as HRMS's validate runs again.
    // InsufficientLeaveBalance: exit 48, LP-008. The approved days as they are now, against the count kept from create.
    const totalLeaveDays = application["totalLeaveDays"] as BigDecimal.BigDecimal;
    if (balance !== undefined && BigDecimal.isLessThan(balance, totalLeaveDays)) {
      yield* Effect.logInfo(`${BigDecimal.format(totalLeaveDays)} days are more than the ${BigDecimal.format(balance)} left`);
      return yield* new InsufficientLeaveBalance({});
    }

    // LeaveDayAttended: exit 51, LP-011. Marked Present or Work From Home since the application was made.
    const attended = firstDayAttended(attendances, application["fromDate"] as string, application["toDate"] as string);
    if (attended !== undefined) {
      yield* Effect.logInfo(`the employee was at work on ${attended}`);
      return yield* new LeaveDayAttended({ attendanceDate: attended as never });
    }

    // Step mark: database, in the store leave-application, attendance, span leave-application.approve.mark. Every leave
    // day is On Leave, in the application's company: a new attendance where none is, another status changed, On Leave
    // left (update_attendance). A holiday the type doesn't count is no leave day, so one already marked is left as it is
    // (CX-leave, call 10).
    const fresh = leaveDays.filter((day) => !attendances.has(day));
    const other = leaveDays.flatMap((day) => {
      const held = attendances.get(day);
      return held !== undefined && held["status"] !== "On Leave" ? [held] : [];
    });
    yield* steps.mark(
      Effect.gen(function* () {
        for (const day of fresh) {
          const id = yield* Ids.of(Attendance.fields.id);
          yield* records.insert(
            Attendance,
            { id, company: application["company"] as never, employee: application["employee"] as never, attendanceDate: day as never, status: "On Leave" },
            "marked",
          );
        }
        for (const held of other) yield* records.update(Attendance, held["id"] as string, { status: "On Leave" });
      }),
    );

    // The move approve, from open, to approved.
    yield* move();

    return { leaveApplication, marked: BigInt(fresh.length), changed: BigInt(other.length) };
  });

export default approve;
