// Scaffolded from blueprint/things/attendance-request/verbs/create.ts. Yours from now on.
import { Effect } from "effect";
import { Handlers } from "@orthograph/language-effect";
import { Errors } from "../../generated/api/src/index.ts";
import type { Handler } from "../../generated/api/src/attendance-request/create.handler.ts";

const { RequesterNotInCompany, RequesterHasLeft, RequestEndsBeforeStart, RequestBeforeJoining } = Errors.declared;

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
const create: Handler = (_payload, { steps, move, id }) =>
  Effect.gen(function* () {
    // Step load: database, span attendance-request.create.load.
    yield* steps.load(Handlers.blank("load: the work this step does"));

    // RequesterNotInCompany: exit 41, AQ-001.
    if (yield* Handlers.blank<boolean>("refuse RequesterNotInCompany when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why RequesterNotInCompany was refused"));
      return yield* new RequesterNotInCompany({});
    }

    // RequesterHasLeft: exit 42, AQ-002.
    if (yield* Handlers.blank<boolean>("refuse RequesterHasLeft when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why RequesterHasLeft was refused"));
      return yield* new RequesterHasLeft({});
    }

    // RequestEndsBeforeStart: exit 43, AQ-003.
    if (yield* Handlers.blank<boolean>("refuse RequestEndsBeforeStart when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why RequestEndsBeforeStart was refused"));
      return yield* new RequestEndsBeforeStart({
        fromDate: yield* Handlers.blank("RequestEndsBeforeStart.fromDate, a Day"),
      });
    }

    // RequestBeforeJoining: exit 44, AQ-004.
    if (yield* Handlers.blank<boolean>("refuse RequestBeforeJoining when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why RequestBeforeJoining was refused"));
      return yield* new RequestBeforeJoining({
        dateOfJoining: yield* Handlers.blank("RequestBeforeJoining.dateOfJoining, a Day"),
      });
    }

    // Step insert: database, span attendance-request.create.insert.
    yield* steps.insert(Handlers.blank("insert: the work this step does"));

    // The move create, to draft.
    yield* move();

    return {
      // AttendanceRequested needs attendanceRequest, and only the answer can give it.
      attendanceRequest: id,
    };
  });

export default create;
