// Scaffolded from blueprint/things/job-applicant/verbs/hold.ts. Yours from now on.
import { Effect } from "effect";
import type { Handler } from "../../generated/api/src/job-applicant/hold.handler.ts";

/**
 * job-applicant.hold: Put an applicant on hold.
 *
 * Who may call, from blueprint/things/company/roles.ts:
 *   the owner of its jobApplicant.company: (company, caller) => company.owner === caller.person
 *
 * Payload, from blueprint/things/job-applicant/verbs/hold.ts:
 *   jobApplicant  job-applicant.id
 *
 * Answer, from blueprint/things/job-applicant/verbs/hold.ts:
 *   jobApplicant  job-applicant.id
 *
 * Refusals:
 *   JobApplicantNotOpen  exit 40   JA-900  the runtime's, when the job-applicant isn't in open, carrying state; from blueprint/things/job-applicant/machine.ts
 *   NotAllowed           exit 3    AR-001  the runtime's, when the caller isn't the owner of its jobApplicant.company; from blueprint/things/company/roles.ts
 *   IdempotencyConflict  exit 120  AR-002  the runtime's, when the same request key comes with another payload; from blueprint/things/job-applicant/verbs/hold.ts
 *
 * Idempotent by request, from blueprint/things/job-applicant/verbs/hold.ts: the same request key from the same caller is one call.
 * Budget, from blueprint/things/job-applicant/verbs/hold.ts: p95 150ms.
 *
 * The job-applicant's machine, from blueprint/things/job-applicant/machine.ts (▶ marks this call):
 *     from       move    to        emits
 *     (creates)  create  open      JobApplicantCreated
 *   ▶ open       hold    hold      JobApplicantHeld
 *     open       reject  rejected  JobApplicantRejected
 *     hold       reject  rejected  JobApplicantRejected
 *     open       accept  accepted  JobApplicantAccepted
 *     hold       accept  accepted  JobApplicantAccepted
 *
 * What the runtime does, so this handler doesn't:
 *   before it runs, it refuses NotAllowed unless the caller is the owner of its jobApplicant.company;
 *   before it runs, it refuses JobApplicantNotOpen unless the job-applicant is in open;
 *   before it runs, it hands in the job-applicant it read as subject, so this handler never reads it again;
 *   each step is its own span: job-applicant.hold.update;
 *   once it answers, it sets the job-applicant's state to hold;
 *   once it answers, it writes JobApplicantHeld: jobApplicant from the answer;
 *   the call is the span job-applicant.hold, and its commit job-applicant.hold.commit.
 */
const hold: Handler = ({ jobApplicant }, { steps, move }) =>
  Effect.gen(function* () {
    // Step update: database, span job-applicant.hold.update. Holding changes no field, only the applicant's state,
    // which the runtime sets once this answers.
    yield* steps.update(Effect.void);

    // The move hold, from open, to hold.
    yield* move();

    return { jobApplicant };
  });

export default hold;
