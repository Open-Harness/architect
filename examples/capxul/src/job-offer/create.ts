// Scaffolded from blueprint/things/job-offer/verbs/create.ts. Yours from now on.
import { Effect } from "effect";
import { Handlers } from "@orthograph/language-effect";
import { Errors } from "../../generated/api/src/index.ts";
import type { Handler } from "../../generated/api/src/job-offer/create.handler.ts";

const { OfferDesignationNotInCompany } = Errors.declared;

/**
 * job-offer.create: Offer an applicant a job, under one of the company's job titles.
 *
 * Who may call, from blueprint/things/company/roles.ts:
 *   the owner of its jobApplicant.company: (company, caller) => company.owner === caller.person
 *
 * Payload, from blueprint/things/job-offer/verbs/create.ts:
 *   jobApplicant  job-offer.jobApplicant
 *   designation   job-offer.designation
 *   offerDate     job-offer.offerDate
 *
 * Answer, from blueprint/things/job-offer/verbs/create.ts:
 *   jobOffer  job-offer.id
 *
 * Refusals:
 *   OfferDesignationNotInCompany  exit 41   JF-001  yours to refuse below; from blueprint/things/job-offer/errors.ts
 *   OfferAlreadyMade              exit 42   JF-002  the runtime's: another job offer holds this job applicant (job-offer.oneOfferPerApplicant); from blueprint/things/job-offer/invariants.ts
 *   DesignationNotFound           exit 4    DS-901  the runtime's, when no designation has that id, carrying id; from blueprint/things/designation/thing.ts
 *   NotAllowed                    exit 3    AR-001  the runtime's, when the caller isn't the owner of its jobApplicant.company; from blueprint/things/company/roles.ts
 *   IdempotencyConflict           exit 120  AR-002  the runtime's, when the same request key comes with another payload; from blueprint/things/job-offer/verbs/create.ts
 *
 * Idempotent by request, from blueprint/things/job-offer/verbs/create.ts: the same request key from the same caller is one call.
 * Budget, from blueprint/things/job-offer/verbs/create.ts: p95 150ms.
 *
 * The job-offer's machine, from blueprint/things/job-offer/machine.ts (▶ marks this call):
 *     from       move    to        emits
 *   ▶ (creates)  create  awaiting  JobOfferMade
 *     awaiting   accept  accepted  JobOfferAccepted
 *     awaiting   reject  rejected  JobOfferRejected
 *
 * What the runtime does, so this handler doesn't:
 *   before it runs, it refuses NotAllowed unless the caller is the owner of its jobApplicant.company;
 *   before it runs, it reads the jobApplicant and hands it in as refs.jobApplicant;
 *   before it runs, it reads the designation and hands it in as refs.designation, refusing DesignationNotFound if there is none;
 *   before it runs, it mints the job-offer's new id and hands it in as id;
 *   each step is its own span: job-offer.create.load, job-offer.create.insert;
 *   once it answers, it sets the job-offer's state to awaiting;
 *   once it answers, it writes JobOfferMade: jobOffer from the answer, jobApplicant from the payload;
 *   the call is the span job-offer.create, and its commit job-offer.create.commit.
 */
const create: Handler = (_payload, { steps, move, id }) =>
  Effect.gen(function* () {
    // Step load: database, span job-offer.create.load.
    yield* steps.load(Handlers.blank("load: the work this step does"));

    // OfferDesignationNotInCompany: exit 41, JF-001.
    if (yield* Handlers.blank<boolean>("refuse OfferDesignationNotInCompany when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why OfferDesignationNotInCompany was refused"));
      return yield* new OfferDesignationNotInCompany({});
    }

    // Step insert: database, span job-offer.create.insert.
    yield* steps.insert(Handlers.blank("insert: the work this step does"));

    // The move create, to awaiting.
    yield* move();

    return {
      // JobOfferMade needs jobOffer, and only the answer can give it.
      jobOffer: id,
    };
  });

export default create;
