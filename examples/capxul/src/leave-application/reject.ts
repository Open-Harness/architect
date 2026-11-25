// Scaffolded from blueprint/things/leave-application/verbs/reject.ts. Yours from now on.
import { Effect } from "effect";
import type { Handler } from "../../generated/api/src/leave-application/reject.handler.ts";

/**
 * leave-application.reject: Reject a leave, marking none of its days.
 *
 * Who may call, from blueprint/things/company/roles.ts:
 *   the owner of its leaveApplication.company: (company, caller) => company.owner === caller.person
 *
 * Payload, from blueprint/things/leave-application/verbs/reject.ts:
 *   leaveApplication  leave-application.id
 *
 * Answer, from blueprint/things/leave-application/verbs/reject.ts:
 *   leaveApplication  leave-application.id
 *
 * Refusals:
 *   LeaveApplicationNotOpen  exit 40   LP-900  the runtime's, when the leave-application isn't in open, carrying state; from blueprint/things/leave-application/machine.ts
 *   NotAllowed               exit 3    AR-001  the runtime's, when the caller isn't the owner of its leaveApplication.company; from blueprint/things/company/roles.ts
 *   IdempotencyConflict      exit 120  AR-002  the runtime's, when the same request key comes with another payload; from blueprint/things/leave-application/verbs/reject.ts
 *
 * Idempotent by request, from blueprint/things/leave-application/verbs/reject.ts: the same request key from the same caller is one call.
 * Budget, from blueprint/things/leave-application/verbs/reject.ts: p95 150ms.
 *
 * The leave-application's machine, from blueprint/things/leave-application/machine.ts (▶ marks this call):
 *     from       move     to         emits
 *     (creates)  create   open       LeaveApplied
 *     open       approve  approved   LeaveApplicationApproved
 *   ▶ open       reject   rejected   LeaveApplicationRejected
 *     open       cancel   cancelled  LeaveApplicationCancelled
 *     approved   cancel   cancelled  LeaveApplicationCancelled
 *
 * What the runtime does, so this handler doesn't:
 *   before it runs, it refuses NotAllowed unless the caller is the owner of its leaveApplication.company;
 *   before it runs, it refuses LeaveApplicationNotOpen unless the leave-application is in open;
 *   before it runs, it hands in the leave-application it read as subject, so this handler never reads it again;
 *   each step is its own span: leave-application.reject.update;
 *   once it answers, it sets the leave-application's state to rejected;
 *   once it answers, it writes LeaveApplicationRejected: leaveApplication from the answer;
 *   the call is the span leave-application.reject, and its commit leave-application.reject.commit.
 */
const reject: Handler = ({ leaveApplication }, { steps, move }) =>
  Effect.gen(function* () {
    // Step update: database, span leave-application.reject.update. A rejected application marks no day and takes no balance; the only change is its state, which the
    // runtime sets once this answers.
    yield* steps.update(Effect.void);

    // The move reject, from open, to rejected.
    yield* move();

    return { leaveApplication };
  });

export default reject;
