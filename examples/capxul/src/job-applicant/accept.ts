// Scaffolded from blueprint/things/job-applicant/verbs/accept.ts. Yours from now on.
import { Effect } from "effect";
import { Handlers } from "@orthograph/language-effect";
import { Errors } from "../../generated/api/src/index.ts";
import type { Handler } from "../../generated/api/src/job-applicant/accept.handler.ts";

const { OfferNotAccepted } = Errors.declared;

/**
 * job-applicant.accept: Mark an applicant accepted, once they have accepted their job offer.
 *
 * Who may call, from blueprint/things/company/roles.ts:
 *   the owner of its jobApplicant.company: (company, caller) => company.owner === caller.person
 *
 * Payload, from blueprint/things/job-applicant/verbs/accept.ts:
 *   jobApplicant  job-applicant.id
 *
 * Answer, from blueprint/things/job-applicant/verbs/accept.ts:
 *   jobApplicant  job-applicant.id
 *
 * Refusals:
 *   OfferNotAccepted     exit 42   JA-002  yours to refuse below; from blueprint/things/job-applicant/errors.ts
 *   JobApplicantNotOpen  exit 40   JA-900  the runtime's, when the job-applicant isn't in open or hold, carrying state; from blueprint/things/job-applicant/machine.ts
 *   NotAllowed           exit 3    AR-001  the runtime's, when the caller isn't the owner of its jobApplicant.company; from blueprint/things/company/roles.ts
 *   IdempotencyConflict  exit 120  AR-002  the runtime's, when the same request key comes with another payload; from blueprint/things/job-applicant/verbs/accept.ts
 *
 * Idempotent by request, from blueprint/things/job-applicant/verbs/accept.ts: the same request key from the same caller is one call.
 * Budget, from blueprint/things/job-applicant/verbs/accept.ts: p95 150ms.
 *
 * The job-applicant's machine, from blueprint/things/job-applicant/machine.ts (▶ marks this call):
 *     from       move    to        emits
 *     (creates)  create  open      JobApplicantCreated
 *     open       hold    hold      JobApplicantHeld
 *     open       reject  rejected  JobApplicantRejected
 *     hold       reject  rejected  JobApplicantRejected
 *   ▶ open       accept  accepted  JobApplicantAccepted
 *   ▶ hold       accept  accepted  JobApplicantAccepted
 *
 * What the runtime does, so this handler doesn't:
 *   before it runs, it refuses NotAllowed unless the caller is the owner of its jobApplicant.company;
 *   before it runs, it refuses JobApplicantNotOpen unless the job-applicant is in open or hold;
 *   before it runs, it hands in the job-applicant it read as subject, so this handler never reads it again;
 *   each step is its own span: job-applicant.accept.load, job-applicant.accept.update;
 *   once it answers, it sets the job-applicant's state to accepted;
 *   once it answers, it writes JobApplicantAccepted: jobApplicant from the answer;
 *   the call is the span job-applicant.accept, and its commit job-applicant.accept.commit.
 */
const accept: Handler = (_payload, { steps, move }) =>
  Effect.gen(function* () {
    // Step load: database, span job-applicant.accept.load.
    yield* steps.load(Handlers.blank("load: the work this step does"));

    // OfferNotAccepted: exit 42, JA-002.
    if (yield* Handlers.blank<boolean>("refuse OfferNotAccepted when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why OfferNotAccepted was refused"));
      return yield* new OfferNotAccepted({});
    }

    // Step update: database, span job-applicant.accept.update.
    yield* steps.update(Handlers.blank("update: the work this step does"));

    // The move accept, from open or hold, to accepted.
    yield* move();

    return {
      jobApplicant: yield* Handlers.blank("jobApplicant, a job-applicant.id"),
    };
  });

export default accept;
