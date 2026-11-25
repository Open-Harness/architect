// Scaffolded from blueprint/things/job-opening/verbs/create.ts. Yours from now on.
import { Effect } from "effect";
import { Records } from "@orthograph/language-effect";
import { Errors } from "../../generated/api/src/index.ts";
import type { Handler } from "../../generated/api/src/job-opening/create.handler.ts";
import { JobOpening } from "../../blueprint/things/job-opening/thing.ts";

const { OpeningWithoutVacancies } = Errors.declared;

/**
 * job-opening.create: Open a job under one of a company's job titles, for some number of people.
 *
 * Who may call, from blueprint/things/company/roles.ts:
 *   the owner of its designation.company: (company, caller) => company.owner === caller.person
 *
 * Payload, from blueprint/things/job-opening/verbs/create.ts:
 *   designation  job-opening.designation
 *   jobTitle     job-opening.jobTitle
 *   vacancies    job-opening.vacancies
 *
 * Answer, from blueprint/things/job-opening/verbs/create.ts:
 *   jobOpening  job-opening.id
 *
 * Refusals:
 *   OpeningWithoutVacancies  exit 41   JO-001  yours to refuse below; from blueprint/things/job-opening/errors.ts
 *   NotAllowed               exit 3    AR-001  the runtime's, when the caller isn't the owner of its designation.company; from blueprint/things/company/roles.ts
 *   IdempotencyConflict      exit 120  AR-002  the runtime's, when the same request key comes with another payload; from blueprint/things/job-opening/verbs/create.ts
 *
 * Idempotent by request, from blueprint/things/job-opening/verbs/create.ts: the same request key from the same caller is one call.
 * Budget, from blueprint/things/job-opening/verbs/create.ts: p95 150ms.
 *
 * The job-opening's machine, from blueprint/things/job-opening/machine.ts (▶ marks this call):
 *     from       move    to      emits
 *   ▶ (creates)  create  open    JobOpeningCreated
 *     open       close   closed  JobOpeningClosed
 *
 * What the runtime does, so this handler doesn't:
 *   before it runs, it refuses NotAllowed unless the caller is the owner of its designation.company;
 *   before it runs, it reads the designation and hands it in as refs.designation;
 *   before it runs, it mints the job-opening's new id and hands it in as id;
 *   each step is its own span: job-opening.create.load, job-opening.create.insert;
 *   once it answers, it sets the job-opening's state to open;
 *   once it answers, it writes JobOpeningCreated: jobOpening from the answer, company from the job-opening as the call left it, vacancies from the payload;
 *   the call is the span job-opening.create, and its commit job-opening.create.commit.
 */
const create: Handler = ({ designation, jobTitle, vacancies }, { steps, move, refs, id }) =>
  Effect.gen(function* () {
    const records = yield* Records;

    // Step load: database, span job-opening.create.load. The runtime read the job title for the role check and hands
    // it in, so this step only takes it.
    const title = yield* steps.load(Effect.succeed(refs.designation));
    if (!title) return yield* Effect.die(new Error(`designation ${designation} was read for the role check and then not found`));

    // OpeningWithoutVacancies: exit 41, JO-001. Capxul's own: an opening hires at least one person.
    if (vacancies < 1n) {
      yield* Effect.logInfo("the opening hires nobody");
      return yield* new OpeningWithoutVacancies({});
    }

    // Step insert: database, span job-opening.create.insert. The opening takes its job title's company.
    yield* steps.insert(
      records.insert(JobOpening, { id, company: title["company"] as never, designation, jobTitle, vacancies }),
    );

    // The move create, to open.
    yield* move();

    return {
      // JobOpeningCreated needs jobOpening, and only the answer can give it.
      jobOpening: id,
    };
  });

export default create;
