// Scaffolded from blueprint/things/leave-application/verbs/cancel.ts. Yours from now on.
import { Effect } from "effect";
import { Handlers } from "@orthograph/language-effect";
import type { Handler } from "../../generated/api/src/leave-application/cancel.handler.ts";

/**
 * leave-application.cancel: Cancel a leave, open or approved.
 *
 * Who may call, from blueprint/things/company/roles.ts:
 *   the owner of its leaveApplication.company: (company, caller) => company.owner === caller.person
 *
 * Payload, from blueprint/things/leave-application/verbs/cancel.ts:
 *   leaveApplication  leave-application.id
 *
 * Answer, from blueprint/things/leave-application/verbs/cancel.ts:
 *   leaveApplication  leave-application.id
 *
 * Refusals:
 *   LeaveApplicationNotOpen  exit 40   LP-900  the runtime's, when the leave-application isn't in open or approved, carrying state; from blueprint/things/leave-application/machine.ts
 *   NotAllowed               exit 3    AR-001  the runtime's, when the caller isn't the owner of its leaveApplication.company; from blueprint/things/company/roles.ts
 *   IdempotencyConflict      exit 120  AR-002  the runtime's, when the same request key comes with another payload; from blueprint/things/leave-application/verbs/cancel.ts
 *
 * Idempotent by request, from blueprint/things/leave-application/verbs/cancel.ts: the same request key from the same caller is one call.
 * Budget, from blueprint/things/leave-application/verbs/cancel.ts: p95 150ms.
 *
 * The leave-application's machine, from blueprint/things/leave-application/machine.ts (▶ marks this call):
 *     from       move     to         emits
 *     (creates)  create   open       LeaveApplied
 *     open       approve  approved   LeaveApplicationApproved
 *     open       reject   rejected   LeaveApplicationRejected
 *   ▶ open       cancel   cancelled  LeaveApplicationCancelled
 *   ▶ approved   cancel   cancelled  LeaveApplicationCancelled
 *
 * What the runtime does, so this handler doesn't:
 *   before it runs, it refuses NotAllowed unless the caller is the owner of its leaveApplication.company;
 *   before it runs, it refuses LeaveApplicationNotOpen unless the leave-application is in open or approved;
 *   before it runs, it hands in the leave-application it read as subject, so this handler never reads it again;
 *   each step is its own span: leave-application.cancel.update;
 *   once it answers, it sets the leave-application's state to cancelled;
 *   once it answers, it writes LeaveApplicationCancelled: leaveApplication from the answer;
 *   the call is the span leave-application.cancel, and its commit leave-application.cancel.commit.
 */
const cancel: Handler = (_payload, { steps, move }) =>
  Effect.gen(function* () {
    // Step update: database, span leave-application.cancel.update.
    yield* steps.update(Handlers.blank("update: the work this step does"));

    // The move cancel, from open or approved, to cancelled.
    yield* move();

    return {
      leaveApplication: yield* Handlers.blank("leaveApplication, a leave-application.id"),
    };
  });

export default cancel;
