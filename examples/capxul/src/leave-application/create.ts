// Scaffolded from blueprint/things/leave-application/verbs/create.ts. Yours from now on.
import { Effect } from "effect";
import { Handlers } from "@orthograph/language-effect";
import { Errors } from "../../generated/api/src/index.ts";
import type { Handler } from "../../generated/api/src/leave-application/create.handler.ts";

const { ApplicantNotInCompany, ApplicantHasLeft, ApplicationTypeNotInCompany, LeaveEndsBeforeStart, LeaveBeforeJoining, NoAllocationCovers, LeaveAllHolidays, InsufficientLeaveBalance, LeaveOverlaps, LeaveTooLong, LeaveDayAttended } = Errors.declared;

/**
 * leave-application.create: Ask for leave of one type, from one day to another, and why.
 *
 * Who may call:
 *   the self of its employee: (employee, caller) => employee.person === caller.person; from blueprint/things/employee/roles.ts
 *   the owner of its company: (company, caller) => company.owner === caller.person; from blueprint/things/company/roles.ts
 *
 * Payload, from blueprint/things/leave-application/verbs/create.ts:
 *   company    leave-application.company
 *   employee   leave-application.employee
 *   leaveType  leave-application.leaveType
 *   fromDate   leave-application.fromDate
 *   toDate     leave-application.toDate
 *   reason     leave-application.reason
 *
 * Answer, from blueprint/things/leave-application/verbs/create.ts:
 *   leaveApplication  leave-application.id
 *   totalLeaveDays    LeaveDays
 *
 * Refusals:
 *   ApplicantNotInCompany        exit 41   LP-001  yours to refuse below; from blueprint/things/leave-application/errors.ts
 *   ApplicantHasLeft             exit 42   LP-002  yours to refuse below; from blueprint/things/leave-application/errors.ts
 *   ApplicationTypeNotInCompany  exit 43   LP-003  yours to refuse below; from blueprint/things/leave-application/errors.ts
 *   LeaveEndsBeforeStart         exit 44   LP-004  yours to refuse below, carrying fromDate; from blueprint/things/leave-application/errors.ts
 *   LeaveBeforeJoining           exit 45   LP-005  yours to refuse below, carrying dateOfJoining; from blueprint/things/leave-application/errors.ts
 *   NoAllocationCovers           exit 46   LP-006  yours to refuse below; from blueprint/things/leave-application/errors.ts
 *   LeaveAllHolidays             exit 47   LP-007  yours to refuse below; from blueprint/things/leave-application/errors.ts
 *   InsufficientLeaveBalance     exit 48   LP-008  yours to refuse below; from blueprint/things/leave-application/errors.ts
 *   LeaveOverlaps                exit 49   LP-009  yours to refuse below; from blueprint/things/leave-application/errors.ts
 *   LeaveTooLong                 exit 50   LP-010  yours to refuse below, carrying maxContinuousDaysAllowed; from blueprint/things/leave-application/errors.ts
 *   LeaveDayAttended             exit 51   LP-011  yours to refuse below, carrying attendanceDate; from blueprint/things/leave-application/errors.ts
 *   CompanyNotFound              exit 4    CO-901  the runtime's, when no company has that id, carrying id; from blueprint/things/company/thing.ts
 *   EmployeeNotFound             exit 4    EM-901  the runtime's, when no employee has that id, carrying id; from blueprint/things/employee/thing.ts
 *   LeaveTypeNotFound            exit 4    LT-901  the runtime's, when no leave-type has that id, carrying id; from blueprint/things/leave-type/thing.ts
 *   NotAllowed                   exit 3    AR-001  the runtime's, when the caller isn't the self of its employee, or the owner of its company; from blueprint/things/employee/roles.ts
 *   IdempotencyConflict          exit 120  AR-002  the runtime's, when the same request key comes with another payload; from blueprint/things/leave-application/verbs/create.ts
 *
 * Idempotent by request, from blueprint/things/leave-application/verbs/create.ts: the same request key from the same caller is one call.
 * Budget, from blueprint/things/leave-application/verbs/create.ts: p95 300ms.
 *
 * The leave-application's machine, from blueprint/things/leave-application/machine.ts (▶ marks this call):
 *     from       move     to         emits
 *   ▶ (creates)  create   open       LeaveApplied
 *     open       approve  approved   LeaveApplicationApproved
 *     open       reject   rejected   LeaveApplicationRejected
 *     open       cancel   cancelled  LeaveApplicationCancelled
 *     approved   cancel   cancelled  LeaveApplicationCancelled
 *
 * What the runtime does, so this handler doesn't:
 *   before it runs, it refuses NotAllowed unless the caller is the self of its employee, or the owner of its company;
 *   before it runs, it reads the company and hands it in as refs.company, refusing CompanyNotFound if there is none;
 *   before it runs, it reads the employee and hands it in as refs.employee, refusing EmployeeNotFound if there is none;
 *   before it runs, it reads the leaveType and hands it in as refs.leaveType, refusing LeaveTypeNotFound if there is none;
 *   before it runs, it mints the leave-application's new id and hands it in as id;
 *   each step is its own span: leave-application.create.load, leave-application.create.insert;
 *   once it answers, it sets the leave-application's state to open;
 *   once it answers, it writes LeaveApplied: leaveApplication from the answer, company, employee and leaveType from the payload;
 *   the call is the span leave-application.create, and its commit leave-application.create.commit.
 */
const create: Handler = (_payload, { steps, move, id }) =>
  Effect.gen(function* () {
    // Step load: database, span leave-application.create.load.
    yield* steps.load(Handlers.blank("load: the work this step does"));

    // ApplicantNotInCompany: exit 41, LP-001.
    if (yield* Handlers.blank<boolean>("refuse ApplicantNotInCompany when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why ApplicantNotInCompany was refused"));
      return yield* new ApplicantNotInCompany({});
    }

    // ApplicantHasLeft: exit 42, LP-002.
    if (yield* Handlers.blank<boolean>("refuse ApplicantHasLeft when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why ApplicantHasLeft was refused"));
      return yield* new ApplicantHasLeft({});
    }

    // ApplicationTypeNotInCompany: exit 43, LP-003.
    if (yield* Handlers.blank<boolean>("refuse ApplicationTypeNotInCompany when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why ApplicationTypeNotInCompany was refused"));
      return yield* new ApplicationTypeNotInCompany({});
    }

    // LeaveEndsBeforeStart: exit 44, LP-004.
    if (yield* Handlers.blank<boolean>("refuse LeaveEndsBeforeStart when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why LeaveEndsBeforeStart was refused"));
      return yield* new LeaveEndsBeforeStart({
        fromDate: yield* Handlers.blank("LeaveEndsBeforeStart.fromDate, a Day"),
      });
    }

    // LeaveBeforeJoining: exit 45, LP-005.
    if (yield* Handlers.blank<boolean>("refuse LeaveBeforeJoining when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why LeaveBeforeJoining was refused"));
      return yield* new LeaveBeforeJoining({
        dateOfJoining: yield* Handlers.blank("LeaveBeforeJoining.dateOfJoining, a Day"),
      });
    }

    // NoAllocationCovers: exit 46, LP-006.
    if (yield* Handlers.blank<boolean>("refuse NoAllocationCovers when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why NoAllocationCovers was refused"));
      return yield* new NoAllocationCovers({});
    }

    // LeaveAllHolidays: exit 47, LP-007.
    if (yield* Handlers.blank<boolean>("refuse LeaveAllHolidays when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why LeaveAllHolidays was refused"));
      return yield* new LeaveAllHolidays({});
    }

    // InsufficientLeaveBalance: exit 48, LP-008.
    if (yield* Handlers.blank<boolean>("refuse InsufficientLeaveBalance when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why InsufficientLeaveBalance was refused"));
      return yield* new InsufficientLeaveBalance({});
    }

    // LeaveOverlaps: exit 49, LP-009.
    if (yield* Handlers.blank<boolean>("refuse LeaveOverlaps when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why LeaveOverlaps was refused"));
      return yield* new LeaveOverlaps({});
    }

    // LeaveTooLong: exit 50, LP-010.
    if (yield* Handlers.blank<boolean>("refuse LeaveTooLong when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why LeaveTooLong was refused"));
      return yield* new LeaveTooLong({
        maxContinuousDaysAllowed: yield* Handlers.blank("LeaveTooLong.maxContinuousDaysAllowed, a MaxContinuousDays"),
      });
    }

    // LeaveDayAttended: exit 51, LP-011.
    if (yield* Handlers.blank<boolean>("refuse LeaveDayAttended when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why LeaveDayAttended was refused"));
      return yield* new LeaveDayAttended({
        attendanceDate: yield* Handlers.blank("LeaveDayAttended.attendanceDate, a Day"),
      });
    }

    // Step insert: database, span leave-application.create.insert.
    yield* steps.insert(Handlers.blank("insert: the work this step does"));

    // The move create, to open.
    yield* move();

    return {
      // LeaveApplied needs leaveApplication, and only the answer can give it.
      leaveApplication: id,
      totalLeaveDays: yield* Handlers.blank("totalLeaveDays, a LeaveDays"),
    };
  });

export default create;
