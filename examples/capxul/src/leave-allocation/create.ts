// Scaffolded from blueprint/things/leave-allocation/verbs/create.ts. Yours from now on.
import { Effect } from "effect";
import { Handlers } from "@orthograph/language-effect";
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
const create: Handler = (_payload, { steps, move, id }) =>
  Effect.gen(function* () {
    // Step load: database, span leave-allocation.create.load.
    yield* steps.load(Handlers.blank("load: the work this step does"));

    // AllocateeNotInCompany: exit 41, LL-001.
    if (yield* Handlers.blank<boolean>("refuse AllocateeNotInCompany when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why AllocateeNotInCompany was refused"));
      return yield* new AllocateeNotInCompany({});
    }

    // AllocateeHasLeft: exit 42, LL-002.
    if (yield* Handlers.blank<boolean>("refuse AllocateeHasLeft when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why AllocateeHasLeft was refused"));
      return yield* new AllocateeHasLeft({});
    }

    // AllocationTypeNotInCompany: exit 43, LL-003.
    if (yield* Handlers.blank<boolean>("refuse AllocationTypeNotInCompany when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why AllocationTypeNotInCompany was refused"));
      return yield* new AllocationTypeNotInCompany({});
    }

    // AllocationEndsBeforeStart: exit 44, LL-004.
    if (yield* Handlers.blank<boolean>("refuse AllocationEndsBeforeStart when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why AllocationEndsBeforeStart was refused"));
      return yield* new AllocationEndsBeforeStart({
        fromDate: yield* Handlers.blank("AllocationEndsBeforeStart.fromDate, a Day"),
      });
    }

    // AllocationOverlaps: exit 45, LL-005.
    if (yield* Handlers.blank<boolean>("refuse AllocationOverlaps when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why AllocationOverlaps was refused"));
      return yield* new AllocationOverlaps({});
    }

    // LeaveWithoutPayNotAllocated: exit 46, LL-006.
    if (yield* Handlers.blank<boolean>("refuse LeaveWithoutPayNotAllocated when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why LeaveWithoutPayNotAllocated was refused"));
      return yield* new LeaveWithoutPayNotAllocated({});
    }

    // NoLeavesAllocated: exit 47, LL-007.
    if (yield* Handlers.blank<boolean>("refuse NoLeavesAllocated when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why NoLeavesAllocated was refused"));
      return yield* new NoLeavesAllocated({});
    }

    // AllocationExceedsPeriod: exit 48, LL-008.
    if (yield* Handlers.blank<boolean>("refuse AllocationExceedsPeriod when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why AllocationExceedsPeriod was refused"));
      return yield* new AllocationExceedsPeriod({});
    }

    // Step insert: database, span leave-allocation.create.insert.
    yield* steps.insert(Handlers.blank("insert: the work this step does"));

    // The move create, to draft.
    yield* move();

    return {
      // LeaveAllocationCreated needs leaveAllocation, and only the answer can give it.
      leaveAllocation: id,
    };
  });

export default create;
