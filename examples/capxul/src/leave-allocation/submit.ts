// Scaffolded from blueprint/things/leave-allocation/verbs/submit.ts. Yours from now on.
import { Effect } from "effect";
import { Handlers } from "@orthograph/language-effect";
import { Errors } from "../../generated/api/src/index.ts";
import type { Handler } from "../../generated/api/src/leave-allocation/submit.handler.ts";

const { AllocationOverlaps } = Errors.declared;

/**
 * leave-allocation.submit: Submit an allocation, so its leave days can be taken.
 *
 * Who may call, from blueprint/things/company/roles.ts:
 *   the owner of its leaveAllocation.company: (company, caller) => company.owner === caller.person
 *
 * Payload, from blueprint/things/leave-allocation/verbs/submit.ts:
 *   leaveAllocation  leave-allocation.id
 *
 * Answer, from blueprint/things/leave-allocation/verbs/submit.ts:
 *   leaveAllocation  leave-allocation.id
 *
 * Refusals:
 *   AllocationOverlaps       exit 45   LL-005  yours to refuse below; from blueprint/things/leave-allocation/errors.ts
 *   LeaveAllocationNotDraft  exit 40   LL-900  the runtime's, when the leave-allocation isn't in draft, carrying state; from blueprint/things/leave-allocation/machine.ts
 *   NotAllowed               exit 3    AR-001  the runtime's, when the caller isn't the owner of its leaveAllocation.company; from blueprint/things/company/roles.ts
 *   IdempotencyConflict      exit 120  AR-002  the runtime's, when the same request key comes with another payload; from blueprint/things/leave-allocation/verbs/submit.ts
 *
 * Idempotent by request, from blueprint/things/leave-allocation/verbs/submit.ts: the same request key from the same caller is one call.
 * Budget, from blueprint/things/leave-allocation/verbs/submit.ts: p95 200ms.
 *
 * The leave-allocation's machine, from blueprint/things/leave-allocation/machine.ts (▶ marks this call):
 *     from       move    to         emits
 *     (creates)  create  draft      LeaveAllocationCreated
 *   ▶ draft      submit  submitted  LeaveAllocationSubmitted
 *
 * What the runtime does, so this handler doesn't:
 *   before it runs, it refuses NotAllowed unless the caller is the owner of its leaveAllocation.company;
 *   before it runs, it refuses LeaveAllocationNotDraft unless the leave-allocation is in draft;
 *   before it runs, it hands in the leave-allocation it read as subject, so this handler never reads it again;
 *   each step is its own span: leave-allocation.submit.load, leave-allocation.submit.update;
 *   once it answers, it sets the leave-allocation's state to submitted;
 *   once it answers, it writes LeaveAllocationSubmitted: leaveAllocation from the answer;
 *   the call is the span leave-allocation.submit, and its commit leave-allocation.submit.commit.
 */
const submit: Handler = (_payload, { steps, move }) =>
  Effect.gen(function* () {
    // Step load: database, span leave-allocation.submit.load.
    yield* steps.load(Handlers.blank("load: the work this step does"));

    // AllocationOverlaps: exit 45, LL-005.
    if (yield* Handlers.blank<boolean>("refuse AllocationOverlaps when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why AllocationOverlaps was refused"));
      return yield* new AllocationOverlaps({});
    }

    // Step update: database, span leave-allocation.submit.update.
    yield* steps.update(Handlers.blank("update: the work this step does"));

    // The move submit, from draft, to submitted.
    yield* move();

    return {
      leaveAllocation: yield* Handlers.blank("leaveAllocation, a leave-allocation.id"),
    };
  });

export default submit;
