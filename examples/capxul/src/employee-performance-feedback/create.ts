// Scaffolded from blueprint/things/employee-performance-feedback/verbs/create.ts. Yours from now on.
import { Effect } from "effect";
import { Handlers } from "@orthograph/language-effect";
import { Errors } from "../../generated/api/src/index.ts";
import type { Handler } from "../../generated/api/src/employee-performance-feedback/create.handler.ts";

const { FeedbackCycleCompleted, FeedbackForOneself, ReviewerNotInCompany, ReviewerHasLeft, FeedbackRatingsDontMatchCriteria, FeedbackRatingOutOfRange } = Errors.declared;

/**
 * employee-performance-feedback.create: Draft your feedback on a colleague's appraisal: what you think, and a rating for each criteria.
 *
 * Who may call, from blueprint/things/employee/roles.ts:
 *   the self of its reviewer: (employee, caller) => employee.person === caller.person
 *
 * Payload, from blueprint/things/employee-performance-feedback/verbs/create.ts:
 *   appraisal  employee-performance-feedback.appraisal
 *   reviewer   employee-performance-feedback.reviewer
 *   feedback   employee-performance-feedback.feedback
 *   ratings    GivenRatings
 *
 * Answer, from blueprint/things/employee-performance-feedback/verbs/create.ts:
 *   employeePerformanceFeedback  employee-performance-feedback.id
 *   totalScore                   employee-performance-feedback.totalScore
 *
 * Refusals:
 *   FeedbackCycleCompleted            exit 41   PF-007  yours to refuse below; from blueprint/things/employee-performance-feedback/errors.ts
 *   FeedbackForOneself                exit 42   PF-002  yours to refuse below; from blueprint/things/employee-performance-feedback/errors.ts
 *   ReviewerNotInCompany              exit 43   PF-003  yours to refuse below; from blueprint/things/employee-performance-feedback/errors.ts
 *   ReviewerHasLeft                   exit 44   PF-004  yours to refuse below; from blueprint/things/employee-performance-feedback/errors.ts
 *   FeedbackRatingsDontMatchCriteria  exit 45   PF-005  yours to refuse below; from blueprint/things/employee-performance-feedback/errors.ts
 *   FeedbackRatingOutOfRange          exit 46   PF-006  yours to refuse below; from blueprint/things/employee-performance-feedback/errors.ts
 *   AppraisalNotFound                 exit 4    AP-901  the runtime's, when no appraisal has that id, carrying id; from blueprint/things/appraisal/thing.ts
 *   NotAllowed                        exit 3    AR-001  the runtime's, when the caller isn't the self of its reviewer; from blueprint/things/employee/roles.ts
 *   IdempotencyConflict               exit 120  AR-002  the runtime's, when the same request key comes with another payload; from blueprint/things/employee-performance-feedback/verbs/create.ts
 *
 * Idempotent by request, from blueprint/things/employee-performance-feedback/verbs/create.ts: the same request key from the same caller is one call.
 * Budget, from blueprint/things/employee-performance-feedback/verbs/create.ts: p95 200ms.
 *
 * The employee-performance-feedback's machine, from blueprint/things/employee-performance-feedback/machine.ts (▶ marks this call):
 *     from       move    to         emits
 *   ▶ (creates)  create  draft      PerformanceFeedbackDrafted
 *     draft      submit  submitted  PerformanceFeedbackSubmitted
 *
 * What the runtime does, so this handler doesn't:
 *   before it runs, it refuses NotAllowed unless the caller is the self of its reviewer;
 *   before it runs, it reads the appraisal and hands it in as refs.appraisal, refusing AppraisalNotFound if there is none;
 *   before it runs, it reads the reviewer and hands it in as refs.reviewer;
 *   before it runs, it mints the employee-performance-feedback's new id and hands it in as id;
 *   each step is its own span: employee-performance-feedback.create.load, employee-performance-feedback.create.insert;
 *   once it answers, it sets the employee-performance-feedback's state to draft;
 *   once it answers, it writes PerformanceFeedbackDrafted: employeePerformanceFeedback from the answer, appraisal and reviewer from the payload;
 *   the call is the span employee-performance-feedback.create, and its commit employee-performance-feedback.create.commit.
 */
const create: Handler = (_payload, { steps, move, id }) =>
  Effect.gen(function* () {
    // Step load: database, span employee-performance-feedback.create.load.
    yield* steps.load(Handlers.blank("load: the work this step does"));

    // FeedbackCycleCompleted: exit 41, PF-007.
    if (yield* Handlers.blank<boolean>("refuse FeedbackCycleCompleted when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why FeedbackCycleCompleted was refused"));
      return yield* new FeedbackCycleCompleted({});
    }

    // FeedbackForOneself: exit 42, PF-002.
    if (yield* Handlers.blank<boolean>("refuse FeedbackForOneself when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why FeedbackForOneself was refused"));
      return yield* new FeedbackForOneself({});
    }

    // ReviewerNotInCompany: exit 43, PF-003.
    if (yield* Handlers.blank<boolean>("refuse ReviewerNotInCompany when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why ReviewerNotInCompany was refused"));
      return yield* new ReviewerNotInCompany({});
    }

    // ReviewerHasLeft: exit 44, PF-004.
    if (yield* Handlers.blank<boolean>("refuse ReviewerHasLeft when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why ReviewerHasLeft was refused"));
      return yield* new ReviewerHasLeft({});
    }

    // FeedbackRatingsDontMatchCriteria: exit 45, PF-005.
    if (yield* Handlers.blank<boolean>("refuse FeedbackRatingsDontMatchCriteria when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why FeedbackRatingsDontMatchCriteria was refused"));
      return yield* new FeedbackRatingsDontMatchCriteria({});
    }

    // FeedbackRatingOutOfRange: exit 46, PF-006.
    if (yield* Handlers.blank<boolean>("refuse FeedbackRatingOutOfRange when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why FeedbackRatingOutOfRange was refused"));
      return yield* new FeedbackRatingOutOfRange({});
    }

    // Step insert: database, span employee-performance-feedback.create.insert.
    yield* steps.insert(Handlers.blank("insert: the work this step does"));

    // The move create, to draft.
    yield* move();

    return {
      // PerformanceFeedbackDrafted needs employeePerformanceFeedback, and only the answer can give it.
      employeePerformanceFeedback: id,
      totalScore: yield* Handlers.blank("totalScore, an employee-performance-feedback.totalScore"),
    };
  });

export default create;
