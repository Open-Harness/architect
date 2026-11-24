// Scaffolded from blueprint/things/interview/verbs/reject.ts. Yours from now on.
import { Effect } from "effect";
import { Handlers } from "@orthograph/language-effect";
import type { Handler } from "../../generated/api/src/interview/reject.handler.ts";

/**
 * interview.reject: Mark an interview rejected.
 *
 * Who may call, from blueprint/things/company/roles.ts:
 *   the owner of its interview.company: (company, caller) => company.owner === caller.person
 *
 * Payload, from blueprint/things/interview/verbs/reject.ts:
 *   interview  interview.id
 *
 * Answer, from blueprint/things/interview/verbs/reject.ts:
 *   interview  interview.id
 *
 * Refusals:
 *   InterviewAlreadyScheduled  exit 46   IV-006  the runtime's: another interview holds this job applicant and interview round (interview.oneInterviewPerRound); from blueprint/things/interview/invariants.ts
 *   InterviewNotPending        exit 40   IV-900  the runtime's, when the interview isn't in pending, carrying state; from blueprint/things/interview/machine.ts
 *   NotAllowed                 exit 3    AR-001  the runtime's, when the caller isn't the owner of its interview.company; from blueprint/things/company/roles.ts
 *   IdempotencyConflict        exit 120  AR-002  the runtime's, when the same request key comes with another payload; from blueprint/things/interview/verbs/reject.ts
 *
 * Idempotent by request, from blueprint/things/interview/verbs/reject.ts: the same request key from the same caller is one call.
 * Budget, from blueprint/things/interview/verbs/reject.ts: p95 150ms.
 *
 * The interview's machine, from blueprint/things/interview/machine.ts (▶ marks this call):
 *     from       move    to        emits
 *     (creates)  create  pending   InterviewScheduled
 *     pending    clear   cleared   InterviewCleared
 *   ▶ pending    reject  rejected  InterviewRejected
 *
 * What the runtime does, so this handler doesn't:
 *   before it runs, it refuses NotAllowed unless the caller is the owner of its interview.company;
 *   before it runs, it refuses InterviewNotPending unless the interview is in pending;
 *   before it runs, it hands in the interview it read as subject, so this handler never reads it again;
 *   each step is its own span: interview.reject.update;
 *   once it answers, it sets the interview's state to rejected;
 *   once it answers, it writes InterviewRejected: interview from the answer;
 *   the call is the span interview.reject, and its commit interview.reject.commit.
 */
const reject: Handler = (_payload, { steps, move }) =>
  Effect.gen(function* () {
    // Step update: database, span interview.reject.update.
    yield* steps.update(Handlers.blank("update: the work this step does"));

    // The move reject, from pending, to rejected.
    yield* move();

    return {
      interview: yield* Handlers.blank("interview, an interview.id"),
    };
  });

export default reject;
