// Scaffolded from blueprint/things/job-offer/verbs/reject.ts. Yours from now on.
import { Effect } from "effect";
import { Handlers } from "@orthograph/language-effect";
import type { Handler } from "../../generated/api/src/job-offer/reject.handler.ts";

/**
 * job-offer.reject: Record that the applicant rejected the offer.
 *
 * Who may call, from blueprint/things/company/roles.ts:
 *   the owner of its jobOffer.company: (company, caller) => company.owner === caller.person
 *
 * Payload, from blueprint/things/job-offer/verbs/reject.ts:
 *   jobOffer  job-offer.id
 *
 * Answer, from blueprint/things/job-offer/verbs/reject.ts:
 *   jobOffer      job-offer.id
 *   jobApplicant  job-offer.jobApplicant
 *
 * Refusals:
 *   OfferAlreadyMade     exit 42   JF-002  the runtime's: another job offer holds this job applicant (job-offer.oneOfferPerApplicant); from blueprint/things/job-offer/invariants.ts
 *   JobOfferNotAwaiting  exit 40   JF-900  the runtime's, when the job-offer isn't in awaiting, carrying state; from blueprint/things/job-offer/machine.ts
 *   NotAllowed           exit 3    AR-001  the runtime's, when the caller isn't the owner of its jobOffer.company; from blueprint/things/company/roles.ts
 *   IdempotencyConflict  exit 120  AR-002  the runtime's, when the same request key comes with another payload; from blueprint/things/job-offer/verbs/reject.ts
 *
 * Idempotent by request, from blueprint/things/job-offer/verbs/reject.ts: the same request key from the same caller is one call.
 * Budget, from blueprint/things/job-offer/verbs/reject.ts: p95 150ms.
 *
 * The job-offer's machine, from blueprint/things/job-offer/machine.ts (▶ marks this call):
 *     from       move    to        emits
 *     (creates)  create  awaiting  JobOfferMade
 *     awaiting   accept  accepted  JobOfferAccepted
 *   ▶ awaiting   reject  rejected  JobOfferRejected
 *
 * What the runtime does, so this handler doesn't:
 *   before it runs, it refuses NotAllowed unless the caller is the owner of its jobOffer.company;
 *   before it runs, it refuses JobOfferNotAwaiting unless the job-offer is in awaiting;
 *   before it runs, it hands in the job-offer it read as subject, so this handler never reads it again;
 *   each step is its own span: job-offer.reject.update;
 *   once it answers, it sets the job-offer's state to rejected;
 *   once it answers, it writes JobOfferRejected: jobOffer and jobApplicant from the answer;
 *   the call is the span job-offer.reject, and its commit job-offer.reject.commit.
 */
const reject: Handler = (_payload, { steps, move }) =>
  Effect.gen(function* () {
    // Step update: database, span job-offer.reject.update.
    yield* steps.update(Handlers.blank("update: the work this step does"));

    // The move reject, from awaiting, to rejected.
    yield* move();

    return {
      jobOffer: yield* Handlers.blank("jobOffer, a job-offer.id"),
      jobApplicant: yield* Handlers.blank("jobApplicant, a job-offer.jobApplicant"),
    };
  });

export default reject;
