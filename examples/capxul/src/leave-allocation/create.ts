// Scaffolded from blueprint/things/leave-allocation/verbs/create.ts. Yours from now on.
import { BigDecimal, Effect } from "effect";
import { Days } from "orthograph";
import { Records } from "@orthograph/language-effect";
import { LeaveAllocation } from "../../blueprint/things/leave-allocation/thing.ts";
import { all, overlaps } from "../leave-application/internal/leave.ts";
import { Errors } from "../../generated/api/src/index.ts";
import type { Handler } from "../../generated/api/src/leave-allocation/create.handler.ts";

const { AllocateeNotInCompany, AllocateeHasLeft, AllocationTypeNotInCompany, AllocationEndsBeforeStart, AllocationOverlaps, LeaveWithoutPayNotAllocated, NoLeavesAllocated, AllocationExceedsPeriod } = Errors.declared;

/**
 * leave-allocation.create: Give an employee leave days of one type, between two days, as a draft.
 *
 * Who may call, from blueprint/things/company/roles.ts:
 *   the owner of its company: (company, caller) => company.owner === caller.person
 *
 * Payload, from blueprint/things/leave-allocation/verbs/create.ts:
 *   company             leave-allocation.company
 *   employee            leave-allocation.employee
 *   leaveType           leave-allocation.leaveType
 *   fromDate            leave-allocation.fromDate
 *   toDate              leave-allocation.toDate
 *   newLeavesAllocated  leave-allocation.newLeavesAllocated
 *
 * Answer, from blueprint/things/leave-allocation/verbs/create.ts:
 *   leaveAllocation  leave-allocation.id
 *
 * Refusals:
 *   AllocateeNotInCompany        exit 41   LL-001  yours to refuse below; from blueprint/things/leave-allocation/errors.ts
 *   AllocateeHasLeft             exit 42   LL-002  yours to refuse below; from blueprint/things/leave-allocation/errors.ts
 *   AllocationTypeNotInCompany   exit 43   LL-003  yours to refuse below; from blueprint/things/leave-allocation/errors.ts
 *   AllocationEndsBeforeStart    exit 44   LL-004  yours to refuse below, carrying fromDate; from blueprint/things/leave-allocation/errors.ts
 *   AllocationOverlaps           exit 45   LL-005  yours to refuse below; from blueprint/things/leave-allocation/errors.ts
 *   LeaveWithoutPayNotAllocated  exit 46   LL-006  yours to refuse below; from blueprint/things/leave-allocation/errors.ts
 *   NoLeavesAllocated            exit 47   LL-007  yours to refuse below; from blueprint/things/leave-allocation/errors.ts
 *   AllocationExceedsPeriod      exit 48   LL-008  yours to refuse below; from blueprint/things/leave-allocation/errors.ts
 *   EmployeeNotFound             exit 4    EM-901  the runtime's, when no employee has that id, carrying id; from blueprint/things/employee/thing.ts
 *   LeaveTypeNotFound            exit 4    LT-901  the runtime's, when no leave-type has that id, carrying id; from blueprint/things/leave-type/thing.ts
 *   NotAllowed                   exit 3    AR-001  the runtime's, when the caller isn't the owner of its company; from blueprint/things/company/roles.ts
 *   IdempotencyConflict          exit 120  AR-002  the runtime's, when the same request key comes with another payload; from blueprint/things/leave-allocation/verbs/create.ts
 *
 * Idempotent by request, from blueprint/things/leave-allocation/verbs/create.ts: the same request key from the same caller is one call.
 * Budget, from blueprint/things/leave-allocation/verbs/create.ts: p95 200ms.
 *
 * The leave-allocation's machine, from blueprint/things/leave-allocation/machine.ts (▶ marks this call):
 *     from       move    to         emits
 *   ▶ (creates)  create  draft      LeaveAllocationCreated
 *     draft      submit  submitted  LeaveAllocationSubmitted
 *
 * What the runtime does, so this handler doesn't:
 *   before it runs, it refuses NotAllowed unless the caller is the owner of its company;
 *   before it runs, it reads the company and hands it in as refs.company;
 *   before it runs, it reads the employee and hands it in as refs.employee, refusing EmployeeNotFound if there is none;
 *   before it runs, it reads the leaveType and hands it in as refs.leaveType, refusing LeaveTypeNotFound if there is none;
 *   before it runs, it mints the leave-allocation's new id and hands it in as id;
 *   each step is its own span: leave-allocation.create.load, leave-allocation.create.insert;
 *   once it answers, it sets the leave-allocation's state to draft;
 *   once it answers, it writes LeaveAllocationCreated: leaveAllocation from the answer, company, employee and leaveType from the payload;
 *   the call is the span leave-allocation.create, and its commit leave-allocation.create.commit.
 */
const create: Handler = ({ company, employee, leaveType, fromDate, toDate, newLeavesAllocated }, { steps, move, refs, id }) =>
  Effect.gen(function* () {
    const records = yield* Records;

    // Step load: database, span leave-allocation.create.load. The runtime read the employee and the type and hands them
    // in; this step lists the employee's submitted allocations of the type (HRMS's docstatus=1).
    const { allocatee, type, submitted } = yield* steps.load(
      Effect.gen(function* () {
        const submitted = yield* records.list({ ...all, thing: LeaveAllocation, where: { employee, leaveType }, state: "submitted" });
        return { allocatee: refs.employee, type: refs.leaveType, submitted: submitted.items };
      }),
    );
    if (!allocatee || !type) return yield* Effect.die(new Error(`employee ${employee} or leave type ${leaveType} was read and then not found`));

    // Refusal order (errors.ts): Capxul's own checks, then HRMS's validate order.
    // AllocateeNotInCompany: exit 41, LL-001.
    if (allocatee["company"] !== company) {
      yield* Effect.logInfo("the employee works for another company");
      return yield* new AllocateeNotInCompany({});
    }

    // AllocateeHasLeft: exit 42, LL-002. Judged on create only (CX-expense-leavers): a draft made before the employee
    // left can still be submitted.
    if (allocatee.state !== "active") {
      yield* Effect.logInfo(`the employee is ${allocatee.state ?? "in no state"}, not active`);
      return yield* new AllocateeHasLeft({});
    }

    // AllocationTypeNotInCompany: exit 43, LL-003. Leave types are per company (CX-leave, call 8).
    if (type["company"] !== company) {
      yield* Effect.logInfo("the leave type is another company's");
      return yield* new AllocationTypeNotInCompany({});
    }

    // AllocationEndsBeforeStart: exit 44, LL-004. The same day is allowed.
    if (toDate < fromDate) {
      yield* Effect.logInfo("the allocation's last day is before its first");
      return yield* new AllocationEndsBeforeStart({ fromDate });
    }

    // AllocationOverlaps: exit 45, LL-005. validate_allocation_overlap, against submitted allocations only.
    if (submitted.some((a) => overlaps(a, fromDate, toDate))) {
      yield* Effect.logInfo("a submitted allocation of the employee and type shares a day with this one");
      return yield* new AllocationOverlaps({});
    }

    // LeaveWithoutPayNotAllocated: exit 46, LL-006. validate_lwp.
    if (type["isLwp"] === true) {
      yield* Effect.logInfo("the leave type is leave without pay");
      return yield* new LeaveWithoutPayNotAllocated({});
    }

    // NoLeavesAllocated: exit 47, LL-007. HRMS refuses 0; Capxul refuses below it too.
    if (!BigDecimal.isPositive(newLeavesAllocated)) {
      yield* Effect.logInfo(`${BigDecimal.format(newLeavesAllocated)} leaves allocated is not more than none`);
      return yield* new NoLeavesAllocated({});
    }

    // AllocationExceedsPeriod: exit 48, LL-008. At most a leave a day, from the first to the last, both counted.
    const period = Days.between(fromDate, toDate) + 1;
    if (BigDecimal.isGreaterThan(newLeavesAllocated, BigDecimal.fromBigInt(BigInt(period)))) {
      yield* Effect.logInfo(`${BigDecimal.format(newLeavesAllocated)} leaves are more than the allocation's ${period} days`);
      return yield* new AllocationExceedsPeriod({});
    }

    // Step insert: database, span leave-allocation.create.insert.
    yield* steps.insert(records.insert(LeaveAllocation, { id, company, employee, leaveType, fromDate, toDate, newLeavesAllocated }));

    // The move create, to draft.
    yield* move();

    return {
      // LeaveAllocationCreated needs leaveAllocation, and only the answer can give it.
      leaveAllocation: id,
    };
  });

export default create;
