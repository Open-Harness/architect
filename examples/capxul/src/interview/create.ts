// Scaffolded from blueprint/things/interview/verbs/create.ts. Yours from now on.
import { Effect } from "effect";
import { Records } from "@orthograph/language-effect";
import { Errors } from "../../generated/api/src/index.ts";
import type { Handler } from "../../generated/api/src/interview/create.handler.ts";
import { Employee } from "../../blueprint/things/employee/thing.ts";
import { Interview } from "../../blueprint/things/interview/thing.ts";

const { ApplicantRejected, RoundNotInCompany, InterviewEndsBeforeStart, InterviewerNotInCompany, InterviewerHasLeft } = Errors.declared;

/**
 * interview.create: Schedule an applicant's interview at a round, on a day, with the employees who interview.
 *
 * Who may call, from blueprint/things/company/roles.ts:
 *   the owner of its jobApplicant.company: (company, caller) => company.owner === caller.person
 *
 * Payload, from blueprint/things/interview/verbs/create.ts:
 *   jobApplicant    interview.jobApplicant
 *   interviewRound  interview.interviewRound
 *   scheduledOn     interview.scheduledOn
 *   fromTime        interview.fromTime
 *   toTime          interview.toTime
 *   interviewers    interview.interviewers
 *
 * Answer, from blueprint/things/interview/verbs/create.ts:
 *   interview  interview.id
 *
 * Refusals:
 *   ApplicantRejected          exit 41   IV-001  yours to refuse below; from blueprint/things/interview/errors.ts
 *   RoundNotInCompany          exit 42   IV-002  yours to refuse below; from blueprint/things/interview/errors.ts
 *   InterviewEndsBeforeStart   exit 43   IV-003  yours to refuse below; from blueprint/things/interview/errors.ts
 *   InterviewerNotInCompany    exit 44   IV-004  yours to refuse below; from blueprint/things/interview/errors.ts
 *   InterviewerHasLeft         exit 45   IV-005  yours to refuse below; from blueprint/things/interview/errors.ts
 *   InterviewAlreadyScheduled  exit 46   IV-006  the runtime's: another interview holds this job applicant and interview round (interview.oneInterviewPerRound); from blueprint/things/interview/invariants.ts
 *   InterviewRoundNotFound     exit 4    IR-901  the runtime's, when no interview-round has that id, carrying id; from blueprint/things/interview-round/thing.ts
 *   NotAllowed                 exit 3    AR-001  the runtime's, when the caller isn't the owner of its jobApplicant.company; from blueprint/things/company/roles.ts
 *   IdempotencyConflict        exit 120  AR-002  the runtime's, when the same request key comes with another payload; from blueprint/things/interview/verbs/create.ts
 *
 * Idempotent by request, from blueprint/things/interview/verbs/create.ts: the same request key from the same caller is one call.
 * Budget, from blueprint/things/interview/verbs/create.ts: p95 200ms.
 *
 * The interview's machine, from blueprint/things/interview/machine.ts (▶ marks this call):
 *     from       move    to        emits
 *   ▶ (creates)  create  pending   InterviewScheduled
 *     pending    clear   cleared   InterviewCleared
 *     pending    reject  rejected  InterviewRejected
 *
 * What the runtime does, so this handler doesn't:
 *   before it runs, it refuses NotAllowed unless the caller is the owner of its jobApplicant.company;
 *   before it runs, it reads the jobApplicant and hands it in as refs.jobApplicant;
 *   before it runs, it reads the interviewRound and hands it in as refs.interviewRound, refusing InterviewRoundNotFound if there is none;
 *   before it runs, it mints the interview's new id and hands it in as id;
 *   each step is its own span: interview.create.load, interview.create.insert;
 *   once it answers, it sets the interview's state to pending;
 *   once it answers, it writes InterviewScheduled: interview from the answer, jobApplicant and interviewRound from the payload;
 *   the call is the span interview.create, and its commit interview.create.commit.
 */
const create: Handler = (
  { jobApplicant, interviewRound, scheduledOn, fromTime, toTime, interviewers },
  { steps, move, refs, id },
) =>
  Effect.gen(function* () {
    const records = yield* Records;

    // Step load: database, span interview.create.load. The runtime read the applicant and the round and hands them in;
    // this step reads every interviewer named, in the order given. One that isn't found is undefined.
    const { applicant, round, found } = yield* steps.load(
      Effect.gen(function* () {
        const found = yield* Effect.forEach(interviewers, (employee) => records.find(Employee, employee));
        return { applicant: refs.jobApplicant, round: refs.interviewRound, found };
      }),
    );
    if (!applicant) return yield* Effect.die(new Error(`job applicant ${jobApplicant} was read for the role check and then not found`));
    if (!round) return yield* Effect.die(new Error(`interview round ${interviewRound} was read and then not found`));
    const company = applicant["company"] as string;

    // Refusal order (errors.ts): ApplicantRejected, RoundNotInCompany, InterviewEndsBeforeStart, then the company check
    // over every interviewer, then the leaver check over every one, wherever each stands in the list.
    // ApplicantRejected: exit 41, IV-001. Only a turned-down applicant; one on hold may still be interviewed.
    if (applicant.state === "rejected") {
      yield* Effect.logInfo("the applicant has been turned down");
      return yield* new ApplicantRejected({});
    }

    // RoundNotInCompany: exit 42, IV-002.
    if (round["company"] !== company) {
      yield* Effect.logInfo("the round belongs to another company");
      return yield* new RoundNotInCompany({});
    }

    // InterviewEndsBeforeStart: exit 43, IV-003. Times are HH:MM, so they compare as text; ending when it starts is
    // refused too.
    if (toTime <= fromTime) {
      yield* Effect.logInfo("the interview ends before it starts");
      return yield* new InterviewEndsBeforeStart({});
    }

    // InterviewerNotInCompany: exit 44, IV-004. An employee that isn't found works for no company here.
    if (found.some((employee) => employee?.["company"] !== company)) {
      yield* Effect.logInfo("an interviewer works for another company");
      return yield* new InterviewerNotInCompany({});
    }

    // InterviewerHasLeft: exit 45, IV-005. A leaver isn't put on a new interview (CX-expense-leavers), whatever its day.
    if (found.some((employee) => employee?.state !== "active")) {
      yield* Effect.logInfo("an interviewer has left the company");
      return yield* new InterviewerHasLeft({});
    }

    // Step insert: database, span interview.create.insert. The interview takes the applicant's company. A second
    // interview for the applicant at this round, in any state, is the runtime's refusal (oneInterviewPerRound).
    yield* steps.insert(
      records.insert(Interview, {
        id,
        company: company as never,
        jobApplicant,
        interviewRound,
        scheduledOn,
        fromTime,
        toTime,
        interviewers,
      }),
    );

    // The move create, to pending.
    yield* move();

    return {
      // InterviewScheduled needs interview, and only the answer can give it.
      interview: id,
    };
  });

export default create;
