// Scaffolded from blueprint/things/interview-feedback/verbs/give.ts. Yours from now on.
import { Effect } from "effect";
import { Handlers } from "@orthograph/language-effect";
import { Errors } from "../../generated/api/src/index.ts";
import type { Handler } from "../../generated/api/src/interview-feedback/give.handler.ts";

const { FeedbackGiverNotInterviewer, FeedbackBeforeInterview } = Errors.declared;

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
const give: Handler = (_payload, { steps, move, id }) =>
  Effect.gen(function* () {
    // Step load: database, span interview-feedback.give.load.
    yield* steps.load(Handlers.blank("load: the work this step does"));

    // FeedbackGiverNotInterviewer: exit 41, IF-001.
    if (yield* Handlers.blank<boolean>("refuse FeedbackGiverNotInterviewer when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why FeedbackGiverNotInterviewer was refused"));
      return yield* new FeedbackGiverNotInterviewer({});
    }

    // FeedbackBeforeInterview: exit 42, IF-002.
    if (yield* Handlers.blank<boolean>("refuse FeedbackBeforeInterview when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why FeedbackBeforeInterview was refused"));
      return yield* new FeedbackBeforeInterview({
        scheduledOn: yield* Handlers.blank("FeedbackBeforeInterview.scheduledOn, a Day"),
      });
    }

    // Step insert: database, span interview-feedback.give.insert.
    yield* steps.insert(Handlers.blank("insert: the work this step does"));

    // The move give, to given.
    yield* move();

    return {
      // InterviewFeedbackGiven needs interviewFeedback, and only the answer can give it.
      interviewFeedback: id,
    };
  });

export default give;
