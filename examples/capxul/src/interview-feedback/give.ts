// Scaffolded from blueprint/things/interview-feedback/verbs/give.ts. Yours from now on.
import { Clock, Effect } from "effect";
import { Days } from "orthograph";
import { Records } from "@orthograph/language-effect";
import { Errors } from "../../generated/api/src/index.ts";
import type { Handler } from "../../generated/api/src/interview-feedback/give.handler.ts";
import { InterviewFeedback } from "../../blueprint/things/interview-feedback/thing.ts";

const { FeedbackGiverNotInterviewer, FeedbackBeforeInterview } = Errors.declared;

const DAY_MS = 86_400_000;

/**
 * interview-feedback.give: Give an interviewer's feedback on an interview: cleared or rejected.
 *
 * Who may call, from blueprint/things/employee/roles.ts:
 *   the self of its interviewer: (employee, caller) => employee.person === caller.person
 *
 * Payload, from blueprint/things/interview-feedback/verbs/give.ts:
 *   interview    interview-feedback.interview
 *   interviewer  interview-feedback.interviewer
 *   result       interview-feedback.result
 *
 * Answer, from blueprint/things/interview-feedback/verbs/give.ts:
 *   interviewFeedback  interview-feedback.id
 *
 * Refusals:
 *   FeedbackGiverNotInterviewer  exit 41   IF-001  yours to refuse below; from blueprint/things/interview-feedback/errors.ts
 *   FeedbackBeforeInterview      exit 42   IF-002  yours to refuse below, carrying scheduledOn; from blueprint/things/interview-feedback/errors.ts
 *   FeedbackAlreadyGiven         exit 43   IF-003  the runtime's: another interview feedback holds this interview and interviewer (interview-feedback.oneFeedbackPerInterviewer); from blueprint/things/interview-feedback/invariants.ts
 *   InterviewNotFound            exit 4    IV-901  the runtime's, when no interview has that id, carrying id; from blueprint/things/interview/thing.ts
 *   NotAllowed                   exit 3    AR-001  the runtime's, when the caller isn't the self of its interviewer; from blueprint/things/employee/roles.ts
 *   IdempotencyConflict          exit 120  AR-002  the runtime's, when the same request key comes with another payload; from blueprint/things/interview-feedback/verbs/give.ts
 *
 * Idempotent by request, from blueprint/things/interview-feedback/verbs/give.ts: the same request key from the same caller is one call.
 * Budget, from blueprint/things/interview-feedback/verbs/give.ts: p95 150ms.
 *
 * The interview-feedback's machine, from blueprint/things/interview-feedback/machine.ts (▶ marks this call):
 *     from       move  to     emits
 *   ▶ (creates)  give  given  InterviewFeedbackGiven
 *
 * What the runtime does, so this handler doesn't:
 *   before it runs, it refuses NotAllowed unless the caller is the self of its interviewer;
 *   before it runs, it reads the interview and hands it in as refs.interview, refusing InterviewNotFound if there is none;
 *   before it runs, it reads the interviewer and hands it in as refs.interviewer;
 *   before it runs, it mints the interview-feedback's new id and hands it in as id;
 *   each step is its own span: interview-feedback.give.load, interview-feedback.give.insert;
 *   once it answers, it sets the interview-feedback's state to given;
 *   once it answers, it writes InterviewFeedbackGiven: interviewFeedback from the answer, interview, interviewer and result from the payload;
 *   the call is the span interview-feedback.give, and its commit interview-feedback.give.commit.
 */
const give: Handler = ({ interview, interviewer, result }, { steps, move, refs, id }) =>
  Effect.gen(function* () {
    const records = yield* Records;

    // Step load: database, span interview-feedback.give.load. The runtime read the interview and hands it in, so this
    // step only takes it. The interviewer isn't judged: a leaver may still give feedback on an interview they were
    // on, in any state, since that finishes an open record (`decisions/CX-recruitment.md`).
    const held = yield* steps.load(Effect.succeed(refs.interview));
    if (!held) return yield* Effect.die(new Error(`interview ${interview} was read and then not found`));
    const scheduledOn = held["scheduledOn"] as string;

    // Refusal order (errors.ts): FeedbackGiverNotInterviewer, then FeedbackBeforeInterview, as HRMS's `validate`.
    // FeedbackGiverNotInterviewer: exit 41, IF-001. HRMS's `validate_interviewer`.
    if (!(held["interviewers"] as ReadonlyArray<string>).includes(interviewer)) {
      yield* Effect.logInfo("the giver isn't one of the interview's interviewers");
      return yield* new FeedbackGiverNotInterviewer({});
    }

    // FeedbackBeforeInterview: exit 42, IF-002. HRMS's `validate_interview_date`, by the world's clock: Effect's Clock
    // reads it, stepped in the local world. Today is its UTC day; the interview's day itself is allowed.
    const today = Days.add("1970-01-01", Math.floor((yield* Clock.currentTimeMillis) / DAY_MS));
    if (today < scheduledOn) {
      yield* Effect.logInfo("the interview's day hasn't come yet");
      return yield* new FeedbackBeforeInterview({ scheduledOn });
    }

    // Step insert: database, span interview-feedback.give.insert. The feedback takes the interview's company. A
    // second from this interviewer is the runtime's refusal (oneFeedbackPerInterviewer).
    yield* steps.insert(
      records.insert(InterviewFeedback, { id, company: held["company"] as never, interview, interviewer, result }),
    );

    // The move give, to given.
    yield* move();

    return {
      // InterviewFeedbackGiven needs interviewFeedback, and only the answer can give it.
      interviewFeedback: id,
    };
  });

export default give;
