// Scaffolded from blueprint/things/attendance-request/verbs/approve.ts. Yours from now on.
import { Effect } from "effect";
import { Days } from "orthograph";
import { Ids, Records } from "@orthograph/language-effect";
import { Attendance } from "../../blueprint/things/attendance/thing.ts";
import { oneAttendancePerDay } from "../../blueprint/things/attendance/invariants.ts";
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
const approve: Handler = ({ attendanceRequest }, { steps, move, subject }) =>
  Effect.gen(function* () {
    const records = yield* Records;

    // Step load: database, span attendance-request.approve.load. The runtime read the request for its role and state
    // checks and hands it in; this step finds each of its days' attendance through oneAttendancePerDay. The employee
    // isn't judged again: a request opened before they left can still be approved (CX-expense-leavers).
    const { request, days } = yield* steps.load(
      Effect.gen(function* () {
        if (!subject) return yield* Effect.die(new Error(`attendance request ${attendanceRequest} was checked and then not found`));
        const fromDate = subject["fromDate"] as string;
        const employee = subject["employee"] as string;
        const all = Array.from({ length: Days.between(fromDate, subject["toDate"] as string) + 1 }, (_, k) => Days.add(fromDate, k));
        const held = yield* Effect.forEach(all, (day) =>
          records.findBy(oneAttendancePerDay, { employee: employee as never, attendanceDate: day as never }),
        );
        return { request: subject, days: all.map((day, i) => ({ day, held: held[i] })) };
      }),
    );

    // Step mark: database, in the store attendance-request, attendance, span attendance-request.approve.mark. Every day
    // is marked Work From Home for that reason and Present for On Duty, weekends included. A day already marked with
    // another status is changed to it, and one with the same status is left, as HRMS's create_or_update_attendance does.
    const status = request["reason"] === "Work From Home" ? "Work From Home" : "Present";
    const fresh = days.filter((d) => d.held === undefined);
    const other = days.flatMap((d) => (d.held !== undefined && d.held["status"] !== status ? [d.held] : []));
    yield* steps.mark(
      Effect.gen(function* () {
        for (const { day } of fresh) {
          const id = yield* Ids.of(Attendance.fields.id);
          yield* records.insert(
            Attendance,
            { id, company: request["company"] as never, employee: request["employee"] as never, attendanceDate: day as never, status },
            "marked",
          );
        }
        for (const held of other) yield* records.update(Attendance, held["id"] as string, { status });
      }),
    );

    // The move approve, from draft, to approved.
    yield* move();

    return { attendanceRequest, marked: BigInt(fresh.length), changed: BigInt(other.length) };
  });

export default approve;
