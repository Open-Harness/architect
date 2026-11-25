// Scaffolded from blueprint/things/job-applicant/verbs/create.ts. Yours from now on.
import { Effect } from "effect";
import { Records } from "@orthograph/language-effect";
import { Errors } from "../../generated/api/src/index.ts";
import type { Handler } from "../../generated/api/src/job-applicant/create.handler.ts";
import { JobApplicant } from "../../blueprint/things/job-applicant/thing.ts";

const { OpeningClosed } = Errors.declared;

/**
 * job-applicant.create: Add a person who applied for a job opening.
 *
 * Who may call, from blueprint/things/company/roles.ts:
 *   the owner of its jobOpening.company: (company, caller) => company.owner === caller.person
 *
 * Payload, from blueprint/things/job-applicant/verbs/create.ts:
 *   jobOpening     job-applicant.jobOpening
 *   applicantName  job-applicant.applicantName
 *   email          job-applicant.email
 *
 * Answer, from blueprint/things/job-applicant/verbs/create.ts:
 *   jobApplicant  job-applicant.id
 *
 * Refusals:
 *   OpeningClosed        exit 41   JA-001  yours to refuse below; from blueprint/things/job-applicant/errors.ts
 *   NotAllowed           exit 3    AR-001  the runtime's, when the caller isn't the owner of its jobOpening.company; from blueprint/things/company/roles.ts
 *   IdempotencyConflict  exit 120  AR-002  the runtime's, when the same request key comes with another payload; from blueprint/things/job-applicant/verbs/create.ts
 *
 * Idempotent by request, from blueprint/things/job-applicant/verbs/create.ts: the same request key from the same caller is one call.
 * Budget, from blueprint/things/job-applicant/verbs/create.ts: p95 150ms.
 *
 * The job-applicant's machine, from blueprint/things/job-applicant/machine.ts (▶ marks this call):
 *     from       move    to        emits
 *   ▶ (creates)  create  open      JobApplicantCreated
 *     open       hold    hold      JobApplicantHeld
 *     open       reject  rejected  JobApplicantRejected
 *     hold       reject  rejected  JobApplicantRejected
 *     open       accept  accepted  JobApplicantAccepted
 *     hold       accept  accepted  JobApplicantAccepted
 *
 * What the runtime does, so this handler doesn't:
 *   before it runs, it refuses NotAllowed unless the caller is the owner of its jobOpening.company;
 *   before it runs, it reads the jobOpening and hands it in as refs.jobOpening;
 *   before it runs, it mints the job-applicant's new id and hands it in as id;
 *   each step is its own span: job-applicant.create.load, job-applicant.create.insert;
 *   once it answers, it sets the job-applicant's state to open;
 *   once it answers, it writes JobApplicantCreated: jobApplicant from the answer, company from the job-applicant as the call left it, jobOpening from the payload;
 *   the call is the span job-applicant.create, and its commit job-applicant.create.commit.
 */
const create: Handler = ({ jobOpening, applicantName, email }, { steps, move, refs, id }) =>
  Effect.gen(function* () {
    const records = yield* Records;

    // Step load: database, span job-applicant.create.load. The runtime read the opening for the role check and hands
    // it in, so this step only takes it.
    const opening = yield* steps.load(Effect.succeed(refs.jobOpening));
    if (!opening) return yield* Effect.die(new Error(`job opening ${jobOpening} was read for the role check and then not found`));

    // OpeningClosed: exit 41, JA-001. HRMS's `before_insert`: nobody new applies for a closed opening.
    if (opening.state === "closed") {
      yield* Effect.logInfo("the job opening is closed");
      return yield* new OpeningClosed({});
    }

    // Step insert: database, span job-applicant.create.insert. The applicant takes the opening's company. The email
    // isn't unique: one person may apply again (HRMS's `autoname`).
    yield* steps.insert(
      records.insert(JobApplicant, { id, company: opening["company"] as never, jobOpening, applicantName, email }),
    );

    // The move create, to open.
    yield* move();

    return {
      // JobApplicantCreated needs jobApplicant, and only the answer can give it.
      jobApplicant: id,
    };
  });

export default create;
