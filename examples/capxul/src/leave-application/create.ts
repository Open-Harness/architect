// Scaffolded from blueprint/things/leave-application/verbs/create.ts. Yours from now on.
import { BigDecimal, Effect } from "effect";
import { Days } from "orthograph";
import { Records } from "@orthograph/language-effect";
import { LeaveApplication } from "../../blueprint/things/leave-application/thing.ts";
import { all, attendancesOf, balanceOf, coveringAllocation, firstDayAttended, leaveDaysOf, overlaps } from "./internal/leave.ts";
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
const create: Handler = ({ company, employee, leaveType, fromDate, toDate, reason }, { steps, move, refs, id }) =>
  Effect.gen(function* () {
    const records = yield* Records;

    // Step load: database, span leave-application.create.load. The runtime read the employee and the type and hands them
    // in. This step lists what the rules judge: the leave days (with the company's holidays), the covering allocation and
    // its balance, the employee's other applications and their attendance. A leave ending before it starts has no days,
    // so nothing past the dates is read for it.
    const applicant = refs.employee;
    const type = refs.leaveType;
    if (!applicant || !type) return yield* Effect.die(new Error(`employee ${employee} or leave type ${leaveType} was read and then not found`));
    const isLwp = type["isLwp"] === true;
    const loaded = yield* steps.load(
      Effect.gen(function* () {
        if (toDate < fromDate) return undefined;
        const leaveDays = yield* leaveDaysOf(type, company, fromDate, toDate);
        const allocation = isLwp ? undefined : yield* coveringAllocation(employee, leaveType, fromDate, toDate);
        const balance = allocation === undefined ? undefined : yield* balanceOf(allocation);
        const theirs = yield* records.list({ ...all, thing: LeaveApplication, where: { employee } });
        const attendances = yield* attendancesOf(employee);
        return { leaveDays, allocation, balance, theirs: theirs.items, attendances };
      }),
    );

    // Refusal order (errors.ts): Capxul's own checks, then HRMS's validate order.
    // ApplicantNotInCompany: exit 41, LP-001.
    if (applicant["company"] !== company) {
      yield* Effect.logInfo("the employee works for another company");
      return yield* new ApplicantNotInCompany({});
    }

    // ApplicantHasLeft: exit 42, LP-002. Judged on create only (CX-expense-leavers).
    if (applicant.state !== "active") {
      yield* Effect.logInfo(`the employee is ${applicant.state ?? "in no state"}, not active`);
      return yield* new ApplicantHasLeft({});
    }

    // ApplicationTypeNotInCompany: exit 43, LP-003. Leave types are per company (CX-leave, call 8).
    if (type["company"] !== company) {
      yield* Effect.logInfo("the leave type is another company's");
      return yield* new ApplicationTypeNotInCompany({});
    }

    // LeaveEndsBeforeStart: exit 44, LP-004. The same day is allowed.
    if (loaded === undefined) {
      yield* Effect.logInfo("the leave's last day is before its first");
      return yield* new LeaveEndsBeforeStart({ fromDate });
    }

    // LeaveBeforeJoining: exit 45, LP-005. Judged on the first day; the joining day itself is allowed (CX-leave, call 7).
    const dateOfJoining = applicant["dateOfJoining"] as typeof fromDate;
    if (fromDate < dateOfJoining) {
      yield* Effect.logInfo("the leave starts before the employee joined");
      return yield* new LeaveBeforeJoining({ dateOfJoining });
    }

    // NoAllocationCovers: exit 46, LP-006. Leave without pay skips it.
    const { leaveDays, allocation, balance, theirs, attendances } = loaded;
    if (!isLwp && allocation === undefined) {
      yield* Effect.logInfo("no one submitted allocation of the employee and type holds both the first and the last day");
      return yield* new NoAllocationCovers({});
    }

    // LeaveAllHolidays: exit 47, LP-007. Every day asked for is a holiday the type doesn't count.
    if (leaveDays.length === 0) {
      yield* Effect.logInfo("every day asked for is a holiday");
      return yield* new LeaveAllHolidays({});
    }

    // InsufficientLeaveBalance: exit 48, LP-008. Only approved applications take the balance. Leave without pay skips it.
    const totalLeaveDays = BigDecimal.fromBigInt(BigInt(leaveDays.length));
    if (balance !== undefined && BigDecimal.isLessThan(balance, totalLeaveDays)) {
      yield* Effect.logInfo(`${leaveDays.length} days are more than the ${BigDecimal.format(balance)} left`);
      return yield* new InsufficientLeaveBalance({});
    }

    // LeaveOverlaps: exit 49, LP-009. An open or approved application of the employee, of any type.
    const live = theirs.filter((a) => a.state === "open" || a.state === "approved");
    if (live.some((a) => overlaps(a, fromDate, toDate))) {
      yield* Effect.logInfo("an open or approved application of the employee shares a day with this one");
      return yield* new LeaveOverlaps({});
    }

    // LeaveTooLong: exit 50, LP-010. With the open or approved applications of the same type that run on from it day
    // after day, either side, counting their leave days. 0 is no limit.
    const maxContinuousDaysAllowed = type["maxContinuousDaysAllowed"] as bigint;
    if (maxContinuousDaysAllowed > 0n) {
      const sameType = live.filter((a) => a["leaveType"] === leaveType);
      let run = totalLeaveDays;
      for (let day = Days.add(fromDate, -1), before; (before = sameType.find((a) => a["toDate"] === day)); day = Days.add(before["fromDate"] as string, -1)) {
        run = BigDecimal.sum(run, before["totalLeaveDays"] as BigDecimal.BigDecimal);
      }
      for (let day = Days.add(toDate, 1), after; (after = sameType.find((a) => a["fromDate"] === day)); day = Days.add(after["toDate"] as string, 1)) {
        run = BigDecimal.sum(run, after["totalLeaveDays"] as BigDecimal.BigDecimal);
      }
      if (BigDecimal.isGreaterThan(run, BigDecimal.fromBigInt(maxContinuousDaysAllowed))) {
        yield* Effect.logInfo(`${BigDecimal.format(run)} leave days in a row are more than the type's ${maxContinuousDaysAllowed}`);
        return yield* new LeaveTooLong({ maxContinuousDaysAllowed: maxContinuousDaysAllowed as never });
      }
    }

    // LeaveDayAttended: exit 51, LP-011. The first day asked for that the employee is marked Present or Work From Home.
    const attended = firstDayAttended(attendances, fromDate, toDate);
    if (attended !== undefined) {
      yield* Effect.logInfo(`the employee was at work on ${attended}`);
      return yield* new LeaveDayAttended({ attendanceDate: attended as typeof fromDate });
    }

    // Step insert: database, span leave-application.create.insert. The day count is kept from here on (CX-leave, call 2).
    yield* steps.insert(records.insert(LeaveApplication, { id, company, employee, leaveType, fromDate, toDate, reason, totalLeaveDays }));

    // The move create, to open.
    yield* move();

    return {
      // LeaveApplied needs leaveApplication, and only the answer can give it.
      leaveApplication: id,
      totalLeaveDays,
    };
  });

export default create;
