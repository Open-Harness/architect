// Scaffolded from blueprint/things/job-opening/verbs/close.ts. Yours from now on.
import { Effect } from "effect";
import type { Handler } from "../../generated/api/src/job-opening/close.handler.ts";

/**
 * job-opening.close: Close a job opening to new applicants.
 *
 * Who may call, from blueprint/things/company/roles.ts:
 *   the owner of its jobOpening.company: (company, caller) => company.owner === caller.person
 *
 * Payload, from blueprint/things/job-opening/verbs/close.ts:
 *   jobOpening  job-opening.id
 *
 * Answer, from blueprint/things/job-opening/verbs/close.ts:
 *   jobOpening  job-opening.id
 *
 * Refusals:
 *   JobOpeningNotOpen    exit 40   JO-900  the runtime's, when the job-opening isn't in open, carrying state; from blueprint/things/job-opening/machine.ts
 *   NotAllowed           exit 3    AR-001  the runtime's, when the caller isn't the owner of its jobOpening.company; from blueprint/things/company/roles.ts
 *   IdempotencyConflict  exit 120  AR-002  the runtime's, when the same request key comes with another payload; from blueprint/things/job-opening/verbs/close.ts
 *
 * Idempotent by request, from blueprint/things/job-opening/verbs/close.ts: the same request key from the same caller is one call.
 * Budget, from blueprint/things/job-opening/verbs/close.ts: p95 150ms.
 *
 * The job-opening's machine, from blueprint/things/job-opening/machine.ts (▶ marks this call):
 *     from       move    to      emits
 *     (creates)  create  open    JobOpeningCreated
 *   ▶ open       close   closed  JobOpeningClosed
 *
 * What the runtime does, so this handler doesn't:
 *   before it runs, it refuses NotAllowed unless the caller is the owner of its jobOpening.company;
 *   before it runs, it refuses JobOpeningNotOpen unless the job-opening is in open;
 *   before it runs, it hands in the job-opening it read as subject, so this handler never reads it again;
 *   each step is its own span: job-opening.close.update;
 *   once it answers, it sets the job-opening's state to closed;
 *   once it answers, it writes JobOpeningClosed: jobOpening from the answer;
 *   the call is the span job-opening.close, and its commit job-opening.close.commit.
 */
const close: Handler = ({ jobOpening }, { steps, move }) =>
  Effect.gen(function* () {
    // Step update: database, span job-opening.close.update. Closing changes no field, only the opening's state, which
    // the runtime sets once this answers.
    yield* steps.update(Effect.void);

    // The move close, from open, to closed.
    yield* move();

    return { jobOpening };
  });

export default close;
