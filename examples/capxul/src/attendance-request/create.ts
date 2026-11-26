// Scaffolded from blueprint/things/attendance-request/verbs/create.ts. Yours from now on.
import { Effect } from "effect";
import { Records } from "@orthograph/language-effect";
import { AttendanceRequest } from "../../blueprint/things/attendance-request/thing.ts";
import { Errors } from "../../generated/api/src/index.ts";
import type { Handler } from "../../generated/api/src/attendance-request/create.handler.ts";

const { RequesterNotInCompany, RequesterHasLeft, RequestEndsBeforeStart, RequestBeforeJoining, AttendanceRequestOverlaps } = Errors.declared;
// Every matching row counts as read at commit; the limit is set so the page holds them all.
const all = { state: undefined, order: "oldest", limit: Number.MAX_SAFE_INTEGER, after: undefined } as const;
/** Two ranges share a day when one's last day is on or after the other's first and its first on or before the other's last. */
const overlaps = (a: { readonly [field: string]: unknown }, from: string, to: string) => (a["toDate"] as string) >= from && (a["fromDate"] as string) <= to;

/**
 * attendance-request.create: Ask for an employee to be marked at work, from one day to another, and why.
 *
 * Who may call:
 *   the self of its employee: (employee, caller) => employee.person === caller.person; from blueprint/things/employee/roles.ts
 *   the owner of its company: (company, caller) => company.owner === caller.person; from blueprint/things/company/roles.ts
 *
 * Payload, from blueprint/things/attendance-request/verbs/create.ts:
 *   company   attendance-request.company
 *   employee  attendance-request.employee
 *   fromDate  attendance-request.fromDate
 *   toDate    attendance-request.toDate
 *   reason    attendance-request.reason
 *
 * Answer, from blueprint/things/attendance-request/verbs/create.ts:
 *   attendanceRequest  attendance-request.id
 *
 * Refusals:
 *   RequesterNotInCompany   exit 41   AQ-001  yours to refuse below; from blueprint/things/attendance-request/errors.ts
 *   RequesterHasLeft        exit 42   AQ-002  yours to refuse below; from blueprint/things/attendance-request/errors.ts
 *   RequestEndsBeforeStart  exit 43   AQ-003  yours to refuse below, carrying fromDate; from blueprint/things/attendance-request/errors.ts
 *   RequestBeforeJoining    exit 44   AQ-004  yours to refuse below, carrying dateOfJoining; from blueprint/things/attendance-request/errors.ts
 *   CompanyNotFound         exit 4    CO-901  the runtime's, when no company has that id, carrying id; from blueprint/things/company/thing.ts
 *   EmployeeNotFound        exit 4    EM-901  the runtime's, when no employee has that id, carrying id; from blueprint/things/employee/thing.ts
 *   NotAllowed              exit 3    AR-001  the runtime's, when the caller isn't the self of its employee, or the owner of its company; from blueprint/things/employee/roles.ts
 *   IdempotencyConflict     exit 120  AR-002  the runtime's, when the same request key comes with another payload; from blueprint/things/attendance-request/verbs/create.ts
 *
 * Idempotent by request, from blueprint/things/attendance-request/verbs/create.ts: the same request key from the same caller is one call.
 * Budget, from blueprint/things/attendance-request/verbs/create.ts: p95 150ms.
 *
 * The attendance-request's machine, from blueprint/things/attendance-request/machine.ts (▶ marks this call):
 *     from       move     to        emits
 *   ▶ (creates)  create   draft     AttendanceRequested
 *     draft      approve  approved  AttendanceRequestApproved
 *     draft      reject   rejected  AttendanceRequestRejected
 *
 * What the runtime does, so this handler doesn't:
 *   before it runs, it refuses NotAllowed unless the caller is the self of its employee, or the owner of its company;
 *   before it runs, it reads the company and hands it in as refs.company, refusing CompanyNotFound if there is none;
 *   before it runs, it reads the employee and hands it in as refs.employee, refusing EmployeeNotFound if there is none;
 *   before it runs, it mints the attendance-request's new id and hands it in as id;
 *   each step is its own span: attendance-request.create.load, attendance-request.create.insert;
 *   once it answers, it sets the attendance-request's state to draft;
 *   once it answers, it writes AttendanceRequested: attendanceRequest from the answer, company and employee from the payload;
 *   the call is the span attendance-request.create, and its commit attendance-request.create.commit.
 */
const create: Handler = ({ company, employee, fromDate, toDate, reason }, { steps, move, refs, id }) =>
  Effect.gen(function* () {
    const records = yield* Records;

    // Step load: database, span attendance-request.create.load. The runtime read the employee for the role check and
    // hands it in; this step lists the employee's other requests.
    const { requester, theirs } = yield* steps.load(
      Effect.gen(function* () {
        const theirs = yield* records.list({ ...all, thing: AttendanceRequest, where: { employee } });
        return { requester: refs.employee, theirs: theirs.items };
      }),
    );
    if (!requester) return yield* Effect.die(new Error(`employee ${employee} was read for the role check and then not found`));

    // Refusal order (errors.ts): RequesterNotInCompany, RequesterHasLeft, RequestEndsBeforeStart, RequestBeforeJoining,
    // AttendanceRequestOverlaps.
    // RequesterNotInCompany: exit 41, AQ-001.
    if (requester["company"] !== company) {
      yield* Effect.logInfo("the employee works for another company");
      return yield* new RequesterNotInCompany({});
    }

    // RequesterHasLeft: exit 42, AQ-002. Judged on create only (CX-expense-leavers): a request opened before the
    // employee left can still be approved.
    if (requester.state !== "active") {
      yield* Effect.logInfo(`the employee is ${requester.state ?? "in no state"}, not active`);
      return yield* new RequesterHasLeft({});
    }

    // RequestEndsBeforeStart: exit 43, AQ-003. Days are YYYY-MM-DD, so they compare as text; one day is allowed.
    if (toDate < fromDate) {
      yield* Effect.logInfo("the request's last day is before its first");
      return yield* new RequestEndsBeforeStart({ fromDate });
    }

    // RequestBeforeJoining: exit 44, AQ-004. Judged on the first day; the joining day itself is allowed.
    const dateOfJoining = requester["dateOfJoining"] as typeof fromDate;
    if (fromDate < dateOfJoining) {
      yield* Effect.logInfo("the request starts before the employee joined");
      return yield* new RequestBeforeJoining({ dateOfJoining });
    }

    // AttendanceRequestOverlaps: exit 45, AQ-005. A draft or approved request of the employee shares a day with this
    // one; a rejected one doesn't (CX-leave, call 6).
    if (theirs.some((r) => (r.state === "draft" || r.state === "approved") && overlaps(r, fromDate, toDate))) {
      yield* Effect.logInfo("a draft or approved request of the employee shares a day with this one");
      return yield* new AttendanceRequestOverlaps({});
    }

    // Step insert: database, span attendance-request.create.insert.
    yield* steps.insert(records.insert(AttendanceRequest, { id, company, employee, fromDate, toDate, reason }));

    // The move create, to draft.
    yield* move();

    return {
      // AttendanceRequested needs attendanceRequest, and only the answer can give it.
      attendanceRequest: id,
    };
  });

export default create;
