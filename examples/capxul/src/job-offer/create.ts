// Scaffolded from blueprint/things/job-offer/verbs/create.ts. Yours from now on.
import { Effect } from "effect";
import { Records } from "@orthograph/language-effect";
import { Errors } from "../../generated/api/src/index.ts";
import type { Handler } from "../../generated/api/src/job-offer/create.handler.ts";
import { JobOffer } from "../../blueprint/things/job-offer/thing.ts";

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
const create: Handler = ({ jobApplicant, designation, offerDate }, { steps, move, refs, id }) =>
  Effect.gen(function* () {
    const records = yield* Records;

    // Step load: database, span job-offer.create.load. The runtime read the applicant and the job title and hands them
    // in, so this step only takes them.
    const { applicant, title } = yield* steps.load(Effect.succeed({ applicant: refs.jobApplicant, title: refs.designation }));
    if (!applicant) return yield* Effect.die(new Error(`job applicant ${jobApplicant} was read for the role check and then not found`));
    if (!title) return yield* Effect.die(new Error(`designation ${designation} was read and then not found`));

    // OfferDesignationNotInCompany: exit 41, JF-001. The job title offered is the applicant's company's, though not
    // necessarily the opening's.
    if (title["company"] !== applicant["company"]) {
      yield* Effect.logInfo("the job title belongs to another company");
      return yield* new OfferDesignationNotInCompany({});
    }

    // Step insert: database, span job-offer.create.insert. The offer takes the applicant's company. A second offer for
    // the applicant, in any state, is the runtime's refusal (oneOfferPerApplicant).
    yield* steps.insert(
      records.insert(JobOffer, { id, company: applicant["company"] as never, jobApplicant, designation, offerDate }),
    );

    // The move create, to awaiting.
    yield* move();

    return {
      // JobOfferMade needs jobOffer, and only the answer can give it.
      jobOffer: id,
    };
  });

export default create;
